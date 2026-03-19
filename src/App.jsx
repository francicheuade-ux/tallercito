import React, { useState, useEffect, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  onSnapshot, 
  updateDoc, 
  deleteDoc,
  query, 
  addDoc, 
  serverTimestamp, 
  writeBatch 
} from 'firebase/firestore';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  Plus, Search, Package, MapPin, MinusCircle, PlusCircle, 
  QrCode, Camera, Trash2, X, ChevronLeft, LayoutDashboard, 
  Box, Check, Sparkles, MessageSquare, Wrench, Car, 
  DollarSign, Save, Edit2, FileText, Printer, Loader2, AlertCircle
} from 'lucide-react';

// --- CONFIGURACIÓN DE FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyA9hkOhPuuNjl93J5Xbhjc601TfiL_S13U",
  authDomain: "tallercito-f1050.firebaseapp.com",
  projectId: "tallercito-f1050",
  storageBucket: "tallercito-f1050.firebasestorage.app",
  messagingSenderId: "1071883330624",
  appId: "1:1071883330624:web:428d9add626f9a90dd6ba5",
  measurementId: "G-5SVJ10BB7N"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const appId = 'tallercito-francisco';
const SCANNER_SCRIPT_URL = "https://unpkg.com/html5-qrcode";

export default function App() {
  const [user, setUser] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [repairs, setRepairs] = useState([]);
  const [view, setView] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  const [diagnosisQuery, setDiagnosisQuery] = useState('');

  const [newProduct, setNewProduct] = useState({
    name: '', sku: '', location: '', quantity: 0, minStock: 1, cost: 0, description: ''
  });

  const [newRepair, setNewRepair] = useState({
    vehicle: '', plate: '', description: '', partsUsed: []
  });

  const showNotification = useCallback((msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  }, []);

  // --- AUTENTICACIÓN ---
  useEffect(() => {
    if (!document.getElementById('qr-scanner-script')) {
      const script = document.createElement('script');
      script.id = 'qr-scanner-script';
      script.src = SCANNER_SCRIPT_URL;
      script.async = true;
      document.body.appendChild(script);
    }

    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (err) {
        console.error("Auth Error:", err);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // --- CARGA DE DATOS EN TIEMPO REAL ---
  useEffect(() => {
    if (!user) return;
    
    const invRef = collection(db, 'artifacts', appId, 'public', 'data', 'inventory');
    const unsubscribeInv = onSnapshot(query(invRef), (snapshot) => {
      const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setInventory(items);
      // FIX: actualizar selectedProduct en tiempo real
      setSelectedProduct(prev => {
        if (!prev) return null;
        const updated = items.find(i => i.id === prev.id);
        return updated || prev;
      });
    }, (err) => console.error("Firestore Error:", err));

    const repRef = collection(db, 'artifacts', appId, 'public', 'data', 'repairs');
    const unsubscribeRep = onSnapshot(query(repRef), (snapshot) => {
      setRepairs(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.error("Firestore Error:", err));

    return () => { unsubscribeInv(); unsubscribeRep(); };
  }, [user]);

  // --- ESCÁNER QR ---
  useEffect(() => {
    let html5QrCode = null;
    const startScanner = async () => {
      if (isScanning && view === 'scan') {
        const Html5Qrcode = window.Html5Qrcode;
        if (!Html5Qrcode) {
          showNotification("Cargando motor de escaneo...", "error");
          setIsScanning(false);
          return;
        }
        try {
          html5QrCode = new Html5Qrcode("qr-reader");
          await html5QrCode.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: { width: 250, height: 250 } },
            (text) => {
              const found = inventory.find(p => p.sku === text || p.id === text);
              if (found) { setSelectedProduct(found); setView('details'); }
              else { showNotification("Código no encontrado", "error"); }
              html5QrCode.stop().then(() => setIsScanning(false));
            },
            () => {}
          );
        } catch (err) {
          console.error("Scanner error:", err);
          setIsScanning(false);
        }
      }
    };
    startScanner();
    return () => { if (html5QrCode?.isScanning) html5QrCode.stop().catch(() => {}); };
  }, [isScanning, view, inventory, showNotification]);

  // --- IA CON CLAUDE ---
  const askClaude = async (prompt) => {
    setAiLoading(true);
    setAiResponse('');
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: "Eres un experto jefe de taller mecánico. Respondé en español, de forma clara y práctica.",
          messages: [{ role: "user", content: prompt }]
        })
      });
      const data = await response.json();
      const text = data.content?.map(b => b.text || '').join('') || "Sin respuesta";
      setAiResponse(text);
    } catch (err) {
      showNotification("Error con la IA", "error");
    } finally {
      setAiLoading(false);
    }
  };

  // --- MANEJADORES ---
  const addProduct = async (e) => {
    e.preventDefault();
    if (!newProduct.name) return;
    const sku = newProduct.sku || `REP-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    try {
      const ref = collection(db, 'artifacts', appId, 'public', 'data', 'inventory');
      await addDoc(ref, { 
        ...newProduct, sku, 
        quantity: Number(newProduct.quantity), 
        cost: Number(newProduct.cost),
        minStock: Number(newProduct.minStock),
        createdAt: serverTimestamp() 
      });
      setNewProduct({ name: '', sku: '', location: '', quantity: 0, minStock: 1, cost: 0, description: '' });
      setView('list');
      showNotification("Repuesto guardado ✓");
    } catch (err) { showNotification("Error al guardar", "error"); }
  };

  const finishRepair = async (e) => {
    e.preventDefault();
    if (newRepair.partsUsed.length === 0) return showNotification("Añadí repuestos usados", "error");
    const batch = writeBatch(db);
    const repairRef = doc(collection(db, 'artifacts', appId, 'public', 'data', 'repairs'));
    const total = newRepair.partsUsed.reduce((s, p) => s + (p.cost * p.qty), 0);
    
    batch.set(repairRef, { ...newRepair, date: serverTimestamp(), totalCost: total });
    newRepair.partsUsed.forEach(part => {
      const iRef = doc(db, 'artifacts', appId, 'public', 'data', 'inventory', part.id);
      const original = inventory.find(i => i.id === part.id);
      if (original) {
        batch.update(iRef, { quantity: Math.max(0, original.quantity - part.qty) });
      }
    });

    await batch.commit();
    setNewRepair({ vehicle: '', plate: '', description: '', partsUsed: [] });
    setView('repairs');
    showNotification("Servicio finalizado ✓");
  };

  const updateStock = async (id, delta) => {
    const item = inventory.find(i => i.id === id);
    if (!item) return;
    const ref = doc(db, 'artifacts', appId, 'public', 'data', 'inventory', id);
    await updateDoc(ref, { quantity: Math.max(0, item.quantity + delta) });
  };

  const deleteProduct = async (id) => {
    if (!window.confirm("¿Eliminar este repuesto?")) return;
    await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'inventory', id));
    setView('list');
    showNotification("Repuesto eliminado");
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-4">
      <Loader2 className="animate-spin text-blue-500 mb-4" size={50} />
      <p className="font-bold">Iniciando TallerMaster...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-20 md:pb-0 md:pl-64">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #p-label, #p-label * { visibility: visible; }
          #p-label { position: absolute; left: 0; top: 0; width: 2cm; height: 2cm; display: flex !important; flex-direction: column; align-items: center; justify-content: center; background: white; }
          .p-txt { font-size: 5px; font-weight: bold; text-align: center; width: 100%; white-space: nowrap; overflow: hidden; }
          .p-qr { width: 1.3cm; height: 1.3cm; }
        }
      `}</style>

      {selectedProduct && (
        <div id="p-label" className="hidden">
          <div className="p-txt uppercase">{selectedProduct.name}</div>
          <img src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${selectedProduct.sku}`} className="p-qr" alt="QR" />
          <div className="p-txt" style={{fontSize: '4px'}}>{selectedProduct.sku}</div>
        </div>
      )}

      {/* Sidebar desktop */}
      <nav className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-64 bg-slate-900 text-white p-6 z-50">
        <div className="flex items-center gap-3 mb-10">
          <div className="bg-blue-600 p-2 rounded-xl"><Wrench size={24}/></div>
          <h1 className="text-xl font-black">TallerMaster</h1>
        </div>
        <div className="space-y-1">
          <NavBtn active={view === 'dashboard'} Icon={LayoutDashboard} label="Panel" onClick={() => setView('dashboard')} />
          <NavBtn active={view === 'list'} Icon={Box} label="Stock" onClick={() => setView('list')} />
          <NavBtn active={view === 'repairs'} Icon={Car} label="Servicios" onClick={() => setView('repairs')} />
          <NavBtn active={view === 'ai_assistant'} Icon={Sparkles} label="Asistente IA" onClick={() => setView('ai_assistant')} />
        </div>
      </nav>

      <main className="p-4 md:p-8 max-w-5xl mx-auto">
        {notification && (
          <div className={`fixed bottom-24 right-4 ${notification.type === 'error' ? 'bg-red-600' : 'bg-slate-800'} text-white p-4 rounded-2xl shadow-2xl z-[100] flex items-center gap-3`}>
            {notification.type === 'error' ? <AlertCircle size={20}/> : <Check className="text-green-400" size={20} />}
            <span className="font-bold">{notification.msg}</span>
          </div>
        )}

        {/* DASHBOARD */}
        {view === 'dashboard' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-black">Resumen</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Stock" value={inventory.length} Icon={Box} color="text-blue-500" bg="bg-blue-50" />
              <StatCard label="Servicios" value={repairs.length} Icon={Car} color="text-purple-500" bg="bg-purple-50" />
              <StatCard label="Alerta" value={inventory.filter(p => p.quantity <= p.minStock).length} Icon={MinusCircle} color="text-red-500" bg="bg-red-50" />
              <StatCard label="Valor" value={`$${inventory.reduce((s,p) => s + (p.cost * p.quantity), 0).toLocaleString()}`} Icon={DollarSign} color="text-green-500" bg="bg-green-50" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button onClick={() => setView('add_repair')} className="p-8 bg-indigo-600 text-white rounded-3xl font-bold text-xl shadow-xl flex flex-col items-center gap-2"><Wrench /> Registrar Trabajo</button>
              <button onClick={() => setView('add')} className="p-8 bg-blue-600 text-white rounded-3xl font-bold text-xl shadow-xl flex flex-col items-center gap-2"><Plus /> Agregar Repuesto</button>
            </div>
            {/* Alertas de stock bajo */}
            {inventory.filter(p => p.quantity <= p.minStock).length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-3xl p-6">
                <h3 className="font-black text-red-600 mb-3 flex items-center gap-2"><AlertCircle size={18}/> Stock bajo</h3>
                <div className="space-y-2">
                  {inventory.filter(p => p.quantity <= p.minStock).map(p => (
                    <div key={p.id} className="flex justify-between text-sm">
                      <span className="font-bold">{p.name}</span>
                      <span className="text-red-500 font-bold">{p.quantity} un.</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* LISTA INVENTARIO */}
        {view === 'list' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
              <h2 className="text-2xl font-black">Inventario</h2>
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input className="w-full pl-10 pr-4 py-3 rounded-2xl border-none shadow-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {inventory.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).map(item => (
                <div key={item.id} onClick={() => { setSelectedProduct(item); setView('details'); }} className="bg-white p-5 rounded-3xl border border-transparent hover:border-blue-200 cursor-pointer shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold truncate pr-2">{item.name}</h3>
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${item.quantity <= item.minStock ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>{item.quantity} un.</span>
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1"><MapPin size={12}/> {item.location || 'Sin ubicación'}</p>
                </div>
              ))}
              {inventory.length === 0 && (
                <div className="col-span-3 text-center py-16 text-slate-400">
                  <Box size={40} className="mx-auto mb-3 opacity-30"/>
                  <p className="font-bold">No hay repuestos todavía</p>
                  <button onClick={() => setView('add')} className="mt-4 bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold text-sm">Agregar el primero</button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* DETALLE PRODUCTO */}
        {view === 'details' && selectedProduct && (
          <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden max-w-xl mx-auto">
            <div className="bg-slate-900 p-8 text-white relative">
              <button onClick={() => setView('list')} className="absolute top-6 left-6 p-2 bg-white/10 rounded-full"><ChevronLeft size={24} /></button>
              <button onClick={() => deleteProduct(selectedProduct.id)} className="absolute top-6 right-6 p-2 bg-red-500/20 rounded-full text-red-400"><Trash2 size={20} /></button>
              <div className="text-center mt-6">
                <h2 className="text-3xl font-black uppercase">{selectedProduct.name}</h2>
                <p className="text-blue-400 font-mono text-xs mt-2">{selectedProduct.sku}</p>
                {selectedProduct.location && <p className="text-slate-400 text-xs mt-1 flex items-center justify-center gap-1"><MapPin size={12}/>{selectedProduct.location}</p>}
              </div>
            </div>
            <div className="p-8 space-y-8">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-6 bg-slate-50 rounded-3xl text-center">
                  <p className={`text-5xl font-black ${selectedProduct.quantity <= selectedProduct.minStock ? 'text-red-500' : ''}`}>{selectedProduct.quantity}</p>
                  <p className="text-xs font-bold text-slate-400">STOCK ACTUAL</p>
                </div>
                <div className="p-6 bg-slate-50 rounded-3xl text-center">
                  <p className="text-2xl font-bold">${selectedProduct.cost?.toLocaleString()}</p>
                  <p className="text-xs font-bold text-slate-400">COSTO UNIT.</p>
                </div>
              </div>
              <div className="flex items-center justify-center gap-6 bg-gray-50 p-4 rounded-2xl">
                <button onClick={() => updateStock(selectedProduct.id, -1)} className="p-4 bg-white shadow rounded-xl hover:bg-red-50"><MinusCircle className="text-red-400"/></button>
                <span className="font-bold text-slate-600">Ajustar Stock</span>
                <button onClick={() => updateStock(selectedProduct.id, 1)} className="p-4 bg-white shadow rounded-xl hover:bg-green-50"><PlusCircle className="text-green-500"/></button>
              </div>
              <div className="flex flex-col items-center gap-4 pt-4 border-t border-dashed">
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${selectedProduct.sku}`} className="w-32 h-32 p-2 bg-white border rounded-2xl" alt="QR" />
                <button onClick={() => window.print()} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-bold flex items-center justify-center gap-2">
                  <Printer size={20} /> Imprimir Etiqueta
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SERVICIOS */}
        {view === 'repairs' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-black">Servicios</h2>
              <button onClick={() => setView('add_repair')} className="bg-indigo-600 text-white px-5 py-3 rounded-2xl font-bold text-sm flex items-center gap-2"><Plus size={16}/> Nuevo</button>
            </div>
            <div className="space-y-4">
              {repairs.sort((a,b) => (b.date?.seconds || 0) - (a.date?.seconds || 0)).map(rep => (
                <div key={rep.id} className="bg-white p-6 rounded-3xl shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-bold text-indigo-700 uppercase">{rep.vehicle}</h4>
                      <p className="text-xs text-slate-400 font-mono">{rep.plate}</p>
                    </div>
                    <span className="text-xl font-black text-green-600">${rep.totalCost?.toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-slate-500 italic mb-3">{rep.description}</p>
                  {rep.partsUsed?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {rep.partsUsed.map((p, i) => (
                        <span key={i} className="bg-slate-100 text-slate-600 px-2 py-1 rounded-full text-[10px] font-bold">{p.qty}x {p.name}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {repairs.length === 0 && (
                <div className="text-center py-16 text-slate-400">
                  <Car size={40} className="mx-auto mb-3 opacity-30"/>
                  <p className="font-bold">No hay servicios registrados</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* NUEVO SERVICIO */}
        {view === 'add_repair' && (
          <form onSubmit={finishRepair} className="bg-white p-8 rounded-[2.5rem] shadow-sm space-y-6 max-w-2xl mx-auto">
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setView('repairs')} className="p-2 bg-slate-100 rounded-xl"><ChevronLeft size={20}/></button>
              <h2 className="text-2xl font-black">Nuevo Servicio</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <input required className="p-4 bg-slate-50 rounded-2xl border-none outline-none" placeholder="Vehículo (ej: Ford Ka)" value={newRepair.vehicle} onChange={e => setNewRepair({...newRepair, vehicle: e.target.value})} />
              <input required className="p-4 bg-slate-50 rounded-2xl border-none outline-none uppercase font-mono" placeholder="Patente" value={newRepair.plate} onChange={e => setNewRepair({...newRepair, plate: e.target.value.toUpperCase()})} />
            </div>
            <textarea className="w-full p-4 bg-slate-50 rounded-2xl border-none h-24 outline-none resize-none" placeholder="Descripción del trabajo realizado..." value={newRepair.description} onChange={e => setNewRepair({...newRepair, description: e.target.value})} />
            <div className="space-y-3">
              <p className="font-bold text-sm text-slate-600">Repuestos utilizados</p>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input className="w-full pl-10 pr-4 py-3 rounded-2xl border bg-slate-50 outline-none" placeholder="Buscar repuesto..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
              {searchTerm && (
                <div className="bg-white border rounded-2xl p-2 max-h-40 overflow-y-auto shadow-xl relative z-10">
                  {inventory.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()) && i.quantity > 0).map(i => (
                    <div key={i.id} onClick={() => { 
                      const exists = newRepair.partsUsed.find(p => p.id === i.id);
                      if (!exists) {
                        setNewRepair({ ...newRepair, partsUsed: [...newRepair.partsUsed, { id: i.id, name: i.name, qty: 1, cost: i.cost }] });
                      }
                      setSearchTerm('');
                    }} className="p-3 hover:bg-indigo-50 rounded-xl cursor-pointer text-xs flex justify-between items-center">
                      <span className="font-bold">{i.name}</span>
                      <span className="text-slate-400">Stock: {i.quantity}</span>
                    </div>
                  ))}
                  {inventory.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
                    <p className="text-center text-slate-400 text-xs p-3">No encontrado</p>
                  )}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {newRepair.partsUsed.map((p, idx) => (
                  <span key={idx} className="bg-indigo-50 text-indigo-700 px-3 py-2 rounded-full text-xs font-bold flex items-center gap-2">
                    {p.qty}x {p.name}
                    <button type="button" onClick={() => setNewRepair({...newRepair, partsUsed: newRepair.partsUsed.filter((_,i) => i !== idx)})}><X size={12}/></button>
                  </span>
                ))}
              </div>
              {newRepair.partsUsed.length > 0 && (
                <div className="bg-green-50 rounded-2xl p-4 text-sm font-bold text-green-700">
                  Total estimado: ${newRepair.partsUsed.reduce((s,p) => s + (p.cost * p.qty), 0).toLocaleString()}
                </div>
              )}
            </div>
            <button type="submit" className="w-full bg-indigo-600 text-white py-5 rounded-3xl font-bold shadow-xl flex items-center justify-center gap-2">
              <Check size={20}/> Finalizar Servicio
            </button>
          </form>
        )}

        {/* AGREGAR REPUESTO */}
        {view === 'add' && (
          <form onSubmit={addProduct} className="bg-white p-8 rounded-[2.5rem] shadow-sm space-y-6 max-w-2xl mx-auto">
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setView('list')} className="p-2 bg-slate-100 rounded-xl"><ChevronLeft size={20}/></button>
              <h2 className="text-2xl font-black">Nuevo Repuesto</h2>
            </div>
            <input required className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none" placeholder="Nombre del repuesto" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
            <input className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none font-mono text-sm" placeholder="Ubicación (ej: Estante A, Cajón 3)" value={newProduct.location} onChange={e => setNewProduct({...newProduct, location: e.target.value})} />
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">Costo $</label>
                <input className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none font-bold" type="number" min="0" value={newProduct.cost} onChange={e => setNewProduct({...newProduct, cost: e.target.value})} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">Stock inicial</label>
                <input className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none font-bold" type="number" min="0" value={newProduct.quantity} onChange={e => setNewProduct({...newProduct, quantity: e.target.value})} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">Stock mínimo</label>
                <input className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none font-bold" type="number" min="0" value={newProduct.minStock} onChange={e => setNewProduct({...newProduct, minStock: e.target.value})} />
              </div>
            </div>
            <button type="submit" className="w-full bg-blue-600 text-white py-5 rounded-3xl font-bold shadow-xl flex items-center justify-center gap-2">
              <Save size={20}/> Guardar Repuesto
            </button>
          </form>
        )}

        {/* ESCÁNER */}
        {view === 'scan' && (
          <div className="bg-slate-950 fixed inset-0 z-[100] flex flex-col items-center justify-center p-6 text-white">
            <button onClick={() => { setIsScanning(false); setView('dashboard'); }} className="absolute top-6 right-6 p-4 bg-white/10 rounded-full"><X size={35} /></button>
            <div id="qr-reader" className="w-full max-w-sm aspect-square border-4 border-blue-500 rounded-[2rem] overflow-hidden bg-slate-900"></div>
            <p className="mt-12 text-2xl font-black animate-pulse">Buscando QR...</p>
          </div>
        )}

        {/* ASISTENTE IA */}
        {view === 'ai_assistant' && (
          <div className="space-y-6 bg-white p-8 rounded-[2.5rem] shadow-sm max-w-2xl mx-auto">
            <h2 className="text-2xl font-black flex items-center gap-2"><Sparkles className="text-blue-500" /> Asistente IA</h2>
            <p className="text-slate-500 text-sm">Describí el problema del vehículo y Claude te da un diagnóstico y pasos a seguir.</p>
            <textarea 
              className="w-full p-6 bg-slate-50 rounded-3xl border-none h-40 outline-none focus:ring-2 focus:ring-blue-500 text-lg leading-relaxed shadow-inner resize-none" 
              placeholder="Ej: Toyota Corolla 2015, ruido metálico en la dirección al girar a la izquierda..." 
              value={diagnosisQuery} 
              onChange={e => setDiagnosisQuery(e.target.value)} 
            />
            <button 
              onClick={() => askClaude(`Soy mecánico. Necesito ayuda con este problema: ${diagnosisQuery}. Dame un diagnóstico probable, qué revisar primero y qué repuestos podría necesitar.`)} 
              disabled={aiLoading || !diagnosisQuery.trim()} 
              className="w-full bg-slate-900 text-white py-5 rounded-3xl font-bold flex items-center justify-center gap-3 shadow-xl disabled:opacity-50"
            >
              {aiLoading ? <><Loader2 className="animate-spin" /> Analizando...</> : <><Sparkles size={20} /> Consultar IA</>}
            </button>
            {aiResponse && (
              <div className="p-8 bg-blue-50 text-blue-900 rounded-3xl text-sm leading-relaxed whitespace-pre-wrap border border-blue-100 shadow-inner">
                {aiResponse}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Menú Móvil */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 p-4 flex justify-around items-center z-50 rounded-t-[2.5rem] shadow-lg">
        <button onClick={() => setView('dashboard')} className={view === 'dashboard' ? 'text-blue-600' : 'text-slate-400'}><LayoutDashboard size={24}/></button>
        <button onClick={() => setView('list')} className={view === 'list' ? 'text-blue-600' : 'text-slate-400'}><Box size={24}/></button>
        <button onClick={() => { setView('scan'); setIsScanning(true); }} className="bg-slate-900 text-white p-5 rounded-full -mt-16 border-8 border-slate-50 shadow-2xl"><Camera size={28}/></button>
        <button onClick={() => setView('repairs')} className={view === 'repairs' ? 'text-blue-600' : 'text-slate-400'}><Car size={24}/></button>
        <button onClick={() => setView('add')} className={view === 'add' ? 'text-blue-600' : 'text-slate-400'}><Plus size={24}/></button>
      </nav>
    </div>
  );
}

function NavBtn({ active, Icon, label, onClick }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all ${active ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
      <Icon size={20} /> <span className="font-bold text-sm">{label}</span>
    </button>
  );
}

function StatCard({ label, value, Icon, color, bg }) {
  return (
    <div className={`${bg} p-6 rounded-[2rem] border border-white shadow-sm`}>
      <div className="bg-white p-2.5 rounded-xl shadow-sm inline-block mb-3">
        <Icon className={color} size={20} />
      </div>
      <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">{label}</p>
      <h4 className="text-2xl font-black text-slate-800 mt-1">{value}</h4>
    </div>
  );
}
