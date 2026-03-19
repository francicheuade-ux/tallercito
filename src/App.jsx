import React, { useState, useEffect, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getFirestore, collection, doc, onSnapshot,
  updateDoc, deleteDoc, query, addDoc, serverTimestamp, writeBatch
} from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import {
  Plus, Search, MapPin, MinusCircle, PlusCircle,
  Camera, Trash2, X, ChevronLeft, LayoutDashboard,
  Box, Check, Sparkles, Wrench, Car, DollarSign,
  Save, Printer, Loader2, AlertCircle, Users, FileText,
  Clock
} from 'lucide-react';

const firebaseConfig = {
  apiKey: "AIzaSyA9hkOhPuuNjl93J5Xbhjc601TfiL_S13U",
  authDomain: "tallercito-f1050.firebaseapp.com",
  projectId: "tallercito-f1050",
  storageBucket: "tallercito-f1050.firebasestorage.app",
  messagingSenderId: "1071883330624",
  appId: "1:1071883330624:web:428d9add626f9a90dd6ba5",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const appId = 'tallercito-francisco';
const GEMINI_KEY = "AIzaSyDRMjep-3rDCWAfVYDZo2DQNo-tHkbRJ0U";
const SCANNER_SCRIPT_URL = "https://unpkg.com/html5-qrcode";

const TALLER_INFO = {
  nombre: "Taller CheCk",
  direccion: "Depietri 1899, San pedro",
  telefono: "3329677336",
  email: "tallerchecksrl@gmail.com"
};

export default function App() {
  const [user, setUser] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [repairs, setRepairs] = useState([]);
  const [clients, setClients] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [view, setView] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  const [diagnosisQuery, setDiagnosisQuery] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState('');

  const [newProduct, setNewProduct] = useState({ name: '', sku: '', location: '', quantity: 0, minStock: 1, cost: 0, imageUrl: '' });
  const [newRepair, setNewRepair] = useState({ vehicle: '', plate: '', km: '', clientName: '', description: '', partsUsed: [], laborCost: 0 });
  const [newClient, setNewClient] = useState({ name: '', phone: '', email: '', vehicles: '' });
  const [newBudget, setNewBudget] = useState({ clientName: '', clientPhone: '', vehicle: '', plate: '', km: '', description: '', partsUsed: [], laborCost: 0, notes: '' });

  const showNotification = useCallback((msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  }, []);

  useEffect(() => {
    if (!document.getElementById('qr-scanner-script')) {
      const script = document.createElement('script');
      script.id = 'qr-scanner-script';
      script.src = SCANNER_SCRIPT_URL;
      script.async = true;
      document.body.appendChild(script);
    }
    signInAnonymously(auth).catch(console.error);
    const unsub = onAuthStateChanged(auth, (u) => { setUser(u); setLoading(false); });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;
    const cols = [
      { name: 'inventory', setter: setInventory, extra: (items) => setSelectedProduct(prev => prev ? items.find(i => i.id === prev.id) || prev : null) },
      { name: 'repairs', setter: setRepairs },
      { name: 'clients', setter: setClients },
      { name: 'budgets', setter: setBudgets },
    ];
    const unsubs = cols.map(({ name, setter, extra }) => {
      const ref = collection(db, 'artifacts', appId, 'public', 'data', name);
      return onSnapshot(query(ref), (snap) => {
        const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setter(items);
        if (extra) extra(items);
      }, console.error);
    });
    return () => unsubs.forEach(u => u());
  }, [user]);

  useEffect(() => {
    let html5QrCode = null;
    if (isScanning && view === 'scan') {
      const start = async () => {
        const Html5Qrcode = window.Html5Qrcode;
        if (!Html5Qrcode) { showNotification("Cargando escáner...", "error"); setIsScanning(false); return; }
        try {
          html5QrCode = new Html5Qrcode("qr-reader");
          await html5QrCode.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 250, height: 250 } },
            (text) => {
              const found = inventory.find(p => p.sku === text || p.id === text);
              if (found) { setSelectedProduct(found); setView('details'); }
              else showNotification("Código no encontrado", "error");
              html5QrCode.stop().then(() => setIsScanning(false));
            }, () => {});
        } catch { setIsScanning(false); }
      };
      start();
    }
    return () => { if (html5QrCode?.isScanning) html5QrCode.stop().catch(() => {}); };
  }, [isScanning, view, inventory, showNotification]);

  const askGemini = async (prompt) => {
    setAiLoading(true);
    setAiResponse('');
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          systemInstruction: { parts: [{ text: "Sos un experto jefe de taller mecánico. Respondé en español, de forma clara y práctica." }] }
        })
      });
      const data = await res.json();
      setAiResponse(data.candidates?.[0]?.content?.parts?.[0]?.text || "Sin respuesta");
    } catch { showNotification("Error con Gemini", "error"); }
    finally { setAiLoading(false); }
  };

  const addProduct = async (e) => {
    e.preventDefault();
    if (!newProduct.name) return;
    const sku = newProduct.sku || `REP-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'inventory'), {
        ...newProduct, sku, quantity: Number(newProduct.quantity), cost: Number(newProduct.cost), minStock: Number(newProduct.minStock), createdAt: serverTimestamp()
      });
      setNewProduct({ name: '', sku: '', location: '', quantity: 0, minStock: 1, cost: 0, imageUrl: '' });
      setView('list');
      showNotification("Repuesto guardado ✓");
    } catch { showNotification("Error al guardar", "error"); }
  };

  const finishRepair = async (e) => {
    e.preventDefault();
    if (!newRepair.vehicle) return showNotification("Ingresá el vehículo", "error");
    const batch = writeBatch(db);
    const repairRef = doc(collection(db, 'artifacts', appId, 'public', 'data', 'repairs'));
    const partsCost = newRepair.partsUsed.reduce((s, p) => s + (p.cost * p.qty), 0);
    const total = partsCost + Number(newRepair.laborCost);
    batch.set(repairRef, { ...newRepair, date: serverTimestamp(), totalCost: total, partsCost, laborCost: Number(newRepair.laborCost) });
    newRepair.partsUsed.forEach(part => {
      const original = inventory.find(i => i.id === part.id);
      if (original) batch.update(doc(db, 'artifacts', appId, 'public', 'data', 'inventory', part.id), { quantity: Math.max(0, original.quantity - part.qty) });
    });
    await batch.commit();
    setNewRepair({ vehicle: '', plate: '', km: '', clientName: '', description: '', partsUsed: [], laborCost: 0 });
    setView('repairs');
    showNotification("Servicio finalizado ✓");
  };

  const saveBudget = async (e) => {
    e.preventDefault();
    if (!newBudget.clientName || !newBudget.vehicle) return showNotification("Completá cliente y vehículo", "error");
    const partsCost = newBudget.partsUsed.reduce((s, p) => s + (p.cost * p.qty), 0);
    const total = partsCost + Number(newBudget.laborCost);
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'budgets'), {
        ...newBudget, date: serverTimestamp(), totalCost: total, partsCost, laborCost: Number(newBudget.laborCost)
      });
      setNewBudget({ clientName: '', clientPhone: '', vehicle: '', plate: '', km: '', description: '', partsUsed: [], laborCost: 0, notes: '' });
      setView('budgets');
      showNotification("Presupuesto guardado ✓");
    } catch { showNotification("Error al guardar", "error"); }
  };

  const addClient = async (e) => {
    e.preventDefault();
    if (!newClient.name) return;
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'clients'), { ...newClient, createdAt: serverTimestamp() });
      setNewClient({ name: '', phone: '', email: '', vehicles: '' });
      setView('clients');
      showNotification("Cliente guardado ✓");
    } catch { showNotification("Error al guardar", "error"); }
  };

  const updateStock = async (id, delta) => {
    const item = inventory.find(i => i.id === id);
    if (!item) return;
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'inventory', id), { quantity: Math.max(0, item.quantity + delta) });
  };

  const deleteItem = async (colName, id, successMsg) => {
    if (!window.confirm("¿Eliminar este elemento?")) return;
    await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', colName, id));
    showNotification(successMsg);
  };

  const printBudget = (budget) => {
    const win = window.open('', '_blank');
    const date = budget.date?.seconds ? new Date(budget.date.seconds * 1000).toLocaleDateString('es-AR') : new Date().toLocaleDateString('es-AR');
    win.document.write(`<html><head><title>Presupuesto</title><style>
      body{font-family:Arial,sans-serif;padding:30px;color:#333;max-width:800px;margin:0 auto}
      .header{display:flex;justify-content:space-between;border-bottom:3px solid #1e40af;padding-bottom:20px;margin-bottom:20px}
      .taller-name{font-size:26px;font-weight:bold;color:#1e40af}
      .taller-info{font-size:12px;color:#666;margin-top:5px}
      .title{font-size:22px;font-weight:bold;color:#1e40af;text-align:right}
      .section-title{font-size:13px;font-weight:bold;background:#f1f5f9;padding:8px 12px;border-radius:6px;margin:15px 0 8px}
      .grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px}
      .field label{font-size:11px;color:#666;display:block}.field span{font-size:14px;font-weight:bold}
      table{width:100%;border-collapse:collapse;margin-top:10px}
      th{background:#1e40af;color:white;padding:10px;text-align:left;font-size:13px}
      td{padding:10px;border-bottom:1px solid #e2e8f0;font-size:13px}
      .total-row{font-weight:bold;background:#f1f5f9}
      .grand-total{font-size:20px;font-weight:bold;color:#1e40af;text-align:right;margin-top:20px;padding:15px;background:#eff6ff;border-radius:8px}
      .footer{margin-top:40px;border-top:1px solid #e2e8f0;padding-top:15px;font-size:11px;color:#999;text-align:center}
    </style></head><body>
    <div class="header">
      <div><div class="taller-name">${TALLER_INFO.nombre}</div><div class="taller-info">${TALLER_INFO.direccion}<br>${TALLER_INFO.telefono} | ${TALLER_INFO.email}</div></div>
      <div><div class="title">PRESUPUESTO</div><div style="font-size:12px;color:#666;text-align:right">Fecha: ${date}</div></div>
    </div>
    <div class="section-title">Cliente</div>
    <div class="grid">
      <div class="field"><label>Nombre</label><span>${budget.clientName}</span></div>
      <div class="field"><label>Teléfono</label><span>${budget.clientPhone || '-'}</span></div>
    </div>
    <div class="section-title">Vehículo</div>
    <div class="grid">
      <div class="field"><label>Vehículo</label><span>${budget.vehicle}</span></div>
      <div class="field"><label>Patente</label><span>${budget.plate || '-'}</span></div>
      <div class="field"><label>Kilometraje</label><span>${budget.km ? budget.km + ' km' : '-'}</span></div>
    </div>
    <div class="section-title">Descripción del trabajo</div>
    <p style="font-size:14px">${budget.description || '-'}</p>
    <div class="section-title">Detalle</div>
    <table>
      <tr><th>Repuesto</th><th>Cant.</th><th>Precio unit.</th><th>Subtotal</th></tr>
      ${budget.partsUsed?.map(p => `<tr><td>${p.name}</td><td>${p.qty}</td><td>$${Number(p.cost).toLocaleString()}</td><td>$${(p.cost * p.qty).toLocaleString()}</td></tr>`).join('')}
      <tr class="total-row"><td colspan="3">Mano de obra</td><td>$${Number(budget.laborCost).toLocaleString()}</td></tr>
    </table>
    <div class="grand-total">TOTAL: $${budget.totalCost?.toLocaleString()}</div>
    ${budget.notes ? `<div class="section-title">Notas</div><p style="background:#fefce8;padding:12px;border-radius:8px;font-size:13px">${budget.notes}</p>` : ''}
    <div class="footer">${TALLER_INFO.nombre} | ${TALLER_INFO.telefono} | Presupuesto válido por 15 días</div>
    </body></html>`);
    win.document.close();
    win.print();
  };

  const vehicleHistory = repairs.filter(r =>
    vehicleFilter && (r.plate?.toLowerCase().includes(vehicleFilter.toLowerCase()) || r.vehicle?.toLowerCase().includes(vehicleFilter.toLowerCase()))
  );

  if (loading) return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
      <Loader2 className="animate-spin text-blue-500 mb-4" size={50}/>
      <p className="font-bold">Iniciando TallerMaster...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans pb-24 md:pb-0 md:pl-64">
      <style>{`
        @media print{body *{visibility:hidden}#p-label,#p-label *{visibility:visible}#p-label{position:absolute;left:0;top:0}}
        .card{background:white;border-radius:1.25rem;box-shadow:0 1px 3px rgba(0,0,0,0.08)}
        .inp{background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:0.75rem;padding:0.75rem 1rem;width:100%;outline:none;transition:border-color 0.2s;font-size:14px}
        .inp:focus{border-color:#3b82f6}
        .btn{background:#1e40af;color:white;padding:0.875rem 1.5rem;border-radius:0.875rem;font-weight:700;display:flex;align-items:center;gap:0.5rem;justify-content:center;cursor:pointer;border:none;width:100%;font-size:15px}
        .lbl{font-size:11px;font-weight:700;color:#64748b;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.05em;display:block}
      `}</style>

      {selectedProduct && (
        <div id="p-label" className="hidden">
          <img src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${selectedProduct.sku}`} alt="QR" style={{width:'1.5cm'}}/>
          <div style={{fontSize:'6px',fontWeight:'bold'}}>{selectedProduct.name}</div>
          <div style={{fontSize:'5px'}}>{selectedProduct.sku}</div>
        </div>
      )}

      {/* Sidebar */}
      <nav className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-64 bg-slate-900 text-white p-5 z-50">
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-blue-600 p-2 rounded-xl"><Wrench size={20}/></div>
          <div><h1 className="text-base font-black">TallerMaster</h1><p className="text-slate-400 text-xs">Gestión de taller</p></div>
        </div>
        <div className="space-y-0.5">
          {[
            {id:'dashboard',Icon:LayoutDashboard,label:'Panel'},
            {id:'list',Icon:Box,label:'Inventario'},
            {id:'repairs',Icon:Car,label:'Servicios'},
            {id:'budgets',Icon:FileText,label:'Presupuestos'},
            {id:'clients',Icon:Users,label:'Clientes'},
            {id:'history',Icon:Clock,label:'Historial'},
            {id:'ai_assistant',Icon:Sparkles,label:'Asistente Gemini'},
          ].map(({id,Icon,label}) => (
            <button key={id} onClick={() => setView(id)} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${view===id?'bg-blue-600 text-white':'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
              <Icon size={17}/>{label}
            </button>
          ))}
        </div>
        <div className="mt-auto">
          <div className="bg-slate-800 rounded-xl p-3 text-xs text-slate-400">
            <p className="font-bold text-slate-300 mb-0.5">{TALLER_INFO.nombre}</p>
            <p>{TALLER_INFO.telefono}</p>
          </div>
        </div>
      </nav>

      <main className="p-4 md:p-6 max-w-4xl mx-auto">
        {notification && (
          <div className={`fixed bottom-28 md:bottom-6 right-4 ${notification.type==='error'?'bg-red-600':'bg-slate-800'} text-white px-5 py-3 rounded-2xl shadow-2xl z-[100] flex items-center gap-3`}>
            {notification.type==='error'?<AlertCircle size={17}/>:<Check className="text-green-400" size={17}/>}
            <span className="font-bold text-sm">{notification.msg}</span>
          </div>
        )}

        {/* DASHBOARD */}
        {view==='dashboard' && (
          <div className="space-y-4">
            <div><h2 className="text-2xl font-black">Panel</h2><p className="text-slate-500 text-sm">Resumen del taller</p></div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                {label:'Repuestos',value:inventory.length,Icon:Box,color:'text-blue-600',bg:'bg-blue-50'},
                {label:'Servicios',value:repairs.length,Icon:Car,color:'text-purple-600',bg:'bg-purple-50'},
                {label:'Stock bajo',value:inventory.filter(p=>p.quantity<=p.minStock).length,Icon:AlertCircle,color:'text-red-500',bg:'bg-red-50'},
                {label:'Clientes',value:clients.length,Icon:Users,color:'text-green-600',bg:'bg-green-50'},
              ].map(({label,value,Icon,color,bg})=>(
                <div key={label} className={`card p-4 ${bg}`}>
                  <Icon className={color} size={18}/>
                  <p className="text-2xl font-black mt-1">{value}</p>
                  <p className="text-xs font-bold text-slate-500 uppercase">{label}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                {label:'Nuevo Servicio',Icon:Wrench,color:'text-indigo-600',bg:'bg-indigo-50',action:'add_repair'},
                {label:'Presupuesto',Icon:FileText,color:'text-blue-600',bg:'bg-blue-50',action:'add_budget'},
                {label:'Agregar Repuesto',Icon:Plus,color:'text-green-600',bg:'bg-green-50',action:'add'},
              ].map(({label,Icon,color,bg,action})=>(
                <button key={action} onClick={()=>setView(action)} className={`card p-4 flex flex-col items-center gap-2 font-bold text-sm hover:shadow-md transition-shadow ${color}`}>
                  <div className={`${bg} p-2.5 rounded-xl`}><Icon size={20}/></div>{label}
                </button>
              ))}
            </div>
            {inventory.filter(p=>p.quantity<=p.minStock).length>0 && (
              <div className="card p-4 border-l-4 border-red-500">
                <h3 className="font-bold text-red-600 flex items-center gap-2 text-sm mb-2"><AlertCircle size={15}/>Stock bajo</h3>
                {inventory.filter(p=>p.quantity<=p.minStock).map(p=>(
                  <div key={p.id} className="flex justify-between text-sm py-1 border-b border-slate-100 last:border-0">
                    <span>{p.name}</span><span className="font-bold text-red-500">{p.quantity} un.</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* INVENTARIO */}
        {view==='list' && (
          <div className="space-y-4">
            <div className="flex gap-3 justify-between items-center">
              <h2 className="text-2xl font-black">Inventario</h2>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15}/>
                <input className="inp pl-9 text-sm" placeholder="Buscar..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}/>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {inventory.filter(p=>p.name.toLowerCase().includes(searchTerm.toLowerCase())).map(item=>(
                <div key={item.id} onClick={()=>{setSelectedProduct(item);setView('details');}} className="card p-4 cursor-pointer hover:shadow-md transition-shadow">
                  {item.imageUrl && <img src={item.imageUrl} alt={item.name} className="w-full h-24 object-cover rounded-xl mb-3"/>}
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-sm">{item.name}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${item.quantity<=item.minStock?'bg-red-100 text-red-600':'bg-green-100 text-green-600'}`}>{item.quantity} un.</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1"><MapPin size={10} className="inline"/> {item.location||'Sin ubicación'}</p>
                  <p className="text-sm font-bold mt-1">${Number(item.cost).toLocaleString()}</p>
                </div>
              ))}
              {inventory.length===0 && <div className="col-span-3 text-center py-16 text-slate-400"><Box size={36} className="mx-auto mb-3 opacity-30"/><p>Sin repuestos</p></div>}
            </div>
          </div>
        )}

        {/* DETALLE */}
        {view==='details' && selectedProduct && (
          <div className="card overflow-hidden max-w-sm mx-auto">
            <div className="bg-slate-900 p-6 text-white relative">
              <button onClick={()=>setView('list')} className="absolute top-4 left-4 p-1.5 bg-white/10 rounded-lg"><ChevronLeft size={18}/></button>
              <button onClick={()=>{deleteItem('inventory',selectedProduct.id,'Eliminado');setView('list');}} className="absolute top-4 right-4 p-1.5 bg-red-500/20 rounded-lg text-red-400"><Trash2 size={16}/></button>
              {selectedProduct.imageUrl && <img src={selectedProduct.imageUrl} alt={selectedProduct.name} className="w-full h-32 object-cover rounded-xl mb-3 opacity-80"/>}
              <div className="text-center mt-2">
                <h2 className="text-xl font-black uppercase">{selectedProduct.name}</h2>
                <p className="text-blue-400 font-mono text-xs mt-1">{selectedProduct.sku}</p>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-4 rounded-xl text-center">
                  <p className={`text-4xl font-black ${selectedProduct.quantity<=selectedProduct.minStock?'text-red-500':''}`}>{selectedProduct.quantity}</p>
                  <p className="text-xs font-bold text-slate-400 uppercase">Stock</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl text-center">
                  <p className="text-xl font-bold">${Number(selectedProduct.cost).toLocaleString()}</p>
                  <p className="text-xs font-bold text-slate-400 uppercase">Costo</p>
                </div>
              </div>
              <div className="flex items-center justify-center gap-4 bg-slate-50 p-3 rounded-xl">
                <button onClick={()=>updateStock(selectedProduct.id,-1)} className="p-2.5 bg-white shadow rounded-xl"><MinusCircle className="text-red-400" size={20}/></button>
                <span className="font-bold text-sm">Ajustar</span>
                <button onClick={()=>updateStock(selectedProduct.id,1)} className="p-2.5 bg-white shadow rounded-xl"><PlusCircle className="text-green-500" size={20}/></button>
              </div>
              <div className="text-center">
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${selectedProduct.sku}`} className="w-24 h-24 mx-auto border p-1 rounded-xl" alt="QR"/>
                <button onClick={()=>window.print()} className="mt-2 flex items-center gap-2 mx-auto text-sm text-slate-600 font-bold px-4 py-2 bg-slate-100 rounded-xl"><Printer size={15}/>Imprimir</button>
              </div>
            </div>
          </div>
        )}

        {/* SERVICIOS */}
        {view==='repairs' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-black">Servicios</h2>
              <button onClick={()=>setView('add_repair')} className="btn" style={{width:'auto',padding:'0.6rem 1rem',fontSize:'13px'}}><Plus size={15}/>Nuevo</button>
            </div>
            {repairs.sort((a,b)=>(b.date?.seconds||0)-(a.date?.seconds||0)).map(rep=>(
              <div key={rep.id} className="card p-4">
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <h4 className="font-bold text-indigo-700">{rep.vehicle} <span className="font-mono text-xs text-slate-400">{rep.plate}</span></h4>
                    <div className="flex gap-3 text-xs text-slate-400 mt-0.5">
                      {rep.clientName && <span><Users size={10} className="inline"/> {rep.clientName}</span>}
                      {rep.km && <span>🔢 {Number(rep.km).toLocaleString()} km</span>}
                      {rep.date?.seconds && <span>📅 {new Date(rep.date.seconds*1000).toLocaleDateString('es-AR')}</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-green-600">${rep.totalCost?.toLocaleString()}</p>
                    {rep.laborCost > 0 && <p className="text-xs text-slate-400">MO: ${Number(rep.laborCost).toLocaleString()}</p>}
                  </div>
                </div>
                <p className="text-sm text-slate-500 italic mb-2">{rep.description}</p>
                <div className="flex flex-wrap gap-1">
                  {rep.partsUsed?.map((p,i)=><span key={i} className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[10px] font-bold">{p.qty}x {p.name}</span>)}
                </div>
              </div>
            ))}
            {repairs.length===0 && <div className="text-center py-16 text-slate-400"><Car size={36} className="mx-auto mb-3 opacity-30"/><p>No hay servicios</p></div>}
          </div>
        )}

        {/* NUEVO SERVICIO */}
        {view==='add_repair' && (
          <form onSubmit={finishRepair} className="card p-5 space-y-4 max-w-xl mx-auto">
            <div className="flex items-center gap-3">
              <button type="button" onClick={()=>setView('repairs')} className="p-2 bg-slate-100 rounded-xl"><ChevronLeft size={18}/></button>
              <h2 className="text-xl font-black">Nuevo Servicio</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><span className="lbl">Vehículo *</span><input className="inp" required placeholder="Toyota Corolla" value={newRepair.vehicle} onChange={e=>setNewRepair({...newRepair,vehicle:e.target.value})}/></div>
              <div><span className="lbl">Patente</span><input className="inp uppercase font-mono" placeholder="ABC123" value={newRepair.plate} onChange={e=>setNewRepair({...newRepair,plate:e.target.value.toUpperCase()})}/></div>
              <div><span className="lbl">Kilometraje</span><input className="inp" type="number" placeholder="75000" value={newRepair.km} onChange={e=>setNewRepair({...newRepair,km:e.target.value})}/></div>
              <div><span className="lbl">Cliente</span><input className="inp" placeholder="Nombre" value={newRepair.clientName} onChange={e=>setNewRepair({...newRepair,clientName:e.target.value})}/></div>
            </div>
            <div><span className="lbl">Descripción</span><textarea className="inp h-20 resize-none" placeholder="Trabajo realizado..." value={newRepair.description} onChange={e=>setNewRepair({...newRepair,description:e.target.value})}/></div>
            <div><span className="lbl">Mano de obra $</span><input className="inp" type="number" min="0" value={newRepair.laborCost} onChange={e=>setNewRepair({...newRepair,laborCost:e.target.value})}/></div>
            <PartSelector inventory={inventory} parts={newRepair.partsUsed} onChange={parts=>setNewRepair({...newRepair,partsUsed:parts})}/>
            {(newRepair.partsUsed.length>0||Number(newRepair.laborCost)>0) && (
              <div className="bg-green-50 rounded-xl p-3 text-sm font-bold text-green-700">
                Total: ${(newRepair.partsUsed.reduce((s,p)=>s+(p.cost*p.qty),0)+Number(newRepair.laborCost)).toLocaleString()}
              </div>
            )}
            <button type="submit" className="btn"><Check size={17}/>Finalizar Servicio</button>
          </form>
        )}

        {/* PRESUPUESTOS */}
        {view==='budgets' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-black">Presupuestos</h2>
              <button onClick={()=>setView('add_budget')} className="btn" style={{width:'auto',padding:'0.6rem 1rem',fontSize:'13px'}}><Plus size={15}/>Nuevo</button>
            </div>
            {budgets.sort((a,b)=>(b.date?.seconds||0)-(a.date?.seconds||0)).map(budget=>(
              <div key={budget.id} className="card p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold">{budget.clientName}</h4>
                    <p className="text-sm text-slate-500">{budget.vehicle}{budget.plate&&` · ${budget.plate}`}</p>
                    {budget.date?.seconds && <p className="text-xs text-slate-400">📅 {new Date(budget.date.seconds*1000).toLocaleDateString('es-AR')}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <p className="text-lg font-black text-blue-600">${budget.totalCost?.toLocaleString()}</p>
                    <div className="flex gap-2">
                      <button onClick={()=>printBudget(budget)} className="flex items-center gap-1 text-xs font-bold bg-slate-100 px-3 py-1.5 rounded-lg"><Printer size={13}/>Imprimir</button>
                      <button onClick={()=>deleteItem('budgets',budget.id,'Eliminado')} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 size={14}/></button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {budgets.length===0 && <div className="text-center py-16 text-slate-400"><FileText size={36} className="mx-auto mb-3 opacity-30"/><p>No hay presupuestos</p></div>}
          </div>
        )}

        {/* NUEVO PRESUPUESTO */}
        {view==='add_budget' && (
          <form onSubmit={saveBudget} className="card p-5 space-y-4 max-w-xl mx-auto">
            <div className="flex items-center gap-3">
              <button type="button" onClick={()=>setView('budgets')} className="p-2 bg-slate-100 rounded-xl"><ChevronLeft size={18}/></button>
              <h2 className="text-xl font-black">Nuevo Presupuesto</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><span className="lbl">Cliente *</span><input className="inp" required placeholder="Juan García" value={newBudget.clientName} onChange={e=>setNewBudget({...newBudget,clientName:e.target.value})}/></div>
              <div><span className="lbl">Teléfono</span><input className="inp" placeholder="11-1234-5678" value={newBudget.clientPhone} onChange={e=>setNewBudget({...newBudget,clientPhone:e.target.value})}/></div>
              <div><span className="lbl">Vehículo *</span><input className="inp" required placeholder="Ford Ka 2018" value={newBudget.vehicle} onChange={e=>setNewBudget({...newBudget,vehicle:e.target.value})}/></div>
              <div><span className="lbl">Patente</span><input className="inp uppercase font-mono" placeholder="ABC123" value={newBudget.plate} onChange={e=>setNewBudget({...newBudget,plate:e.target.value.toUpperCase()})}/></div>
              <div><span className="lbl">Kilometraje</span><input className="inp" type="number" placeholder="75000" value={newBudget.km} onChange={e=>setNewBudget({...newBudget,km:e.target.value})}/></div>
              <div><span className="lbl">Mano de obra $</span><input className="inp" type="number" min="0" value={newBudget.laborCost} onChange={e=>setNewBudget({...newBudget,laborCost:e.target.value})}/></div>
            </div>
            <div><span className="lbl">Descripción del trabajo</span><textarea className="inp h-20 resize-none" placeholder="Qué se va a realizar..." value={newBudget.description} onChange={e=>setNewBudget({...newBudget,description:e.target.value})}/></div>
            <PartSelector inventory={inventory} parts={newBudget.partsUsed} onChange={parts=>setNewBudget({...newBudget,partsUsed:parts})}/>
            <div><span className="lbl">Notas</span><textarea className="inp h-16 resize-none" placeholder="Garantía, condiciones, etc..." value={newBudget.notes} onChange={e=>setNewBudget({...newBudget,notes:e.target.value})}/></div>
            {(newBudget.partsUsed.length>0||Number(newBudget.laborCost)>0) && (
              <div className="bg-blue-50 rounded-xl p-3 text-sm font-bold text-blue-700">
                Total: ${(newBudget.partsUsed.reduce((s,p)=>s+(p.cost*p.qty),0)+Number(newBudget.laborCost)).toLocaleString()}
              </div>
            )}
            <button type="submit" className="btn"><Save size={17}/>Guardar Presupuesto</button>
          </form>
        )}

        {/* CLIENTES */}
        {view==='clients' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-black">Clientes</h2>
              <button onClick={()=>setView('add_client')} className="btn" style={{width:'auto',padding:'0.6rem 1rem',fontSize:'13px'}}><Plus size={15}/>Nuevo</button>
            </div>
            {clients.map(client=>(
              <div key={client.id} className="card p-4 flex justify-between items-center">
                <div>
                  <h4 className="font-bold">{client.name}</h4>
                  {client.phone && <p className="text-sm text-slate-500">📞 {client.phone}</p>}
                  {client.email && <p className="text-xs text-slate-400">{client.email}</p>}
                  {client.vehicles && <p className="text-xs text-slate-400">🚗 {client.vehicles}</p>}
                </div>
                <button onClick={()=>deleteItem('clients',client.id,'Cliente eliminado')} className="p-2 text-red-400 hover:bg-red-50 rounded-xl"><Trash2 size={16}/></button>
              </div>
            ))}
            {clients.length===0 && <div className="text-center py-16 text-slate-400"><Users size={36} className="mx-auto mb-3 opacity-30"/><p>No hay clientes</p></div>}
          </div>
        )}

        {/* NUEVO CLIENTE */}
        {view==='add_client' && (
          <form onSubmit={addClient} className="card p-5 space-y-4 max-w-md mx-auto">
            <div className="flex items-center gap-3">
              <button type="button" onClick={()=>setView('clients')} className="p-2 bg-slate-100 rounded-xl"><ChevronLeft size={18}/></button>
              <h2 className="text-xl font-black">Nuevo Cliente</h2>
            </div>
            <div><span className="lbl">Nombre *</span><input className="inp" required placeholder="Juan García" value={newClient.name} onChange={e=>setNewClient({...newClient,name:e.target.value})}/></div>
            <div><span className="lbl">Teléfono</span><input className="inp" placeholder="11-1234-5678" value={newClient.phone} onChange={e=>setNewClient({...newClient,phone:e.target.value})}/></div>
            <div><span className="lbl">Email</span><input className="inp" type="email" placeholder="juan@email.com" value={newClient.email} onChange={e=>setNewClient({...newClient,email:e.target.value})}/></div>
            <div><span className="lbl">Vehículos</span><input className="inp" placeholder="Ford Ka 2018, Toyota Corolla 2020" value={newClient.vehicles} onChange={e=>setNewClient({...newClient,vehicles:e.target.value})}/></div>
            <button type="submit" className="btn"><Save size={17}/>Guardar Cliente</button>
          </form>
        )}

        {/* HISTORIAL */}
        {view==='history' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-black">Historial por Vehículo</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15}/>
              <input className="inp pl-9" placeholder="Buscar por patente o vehículo..." value={vehicleFilter} onChange={e=>setVehicleFilter(e.target.value)}/>
            </div>
            {vehicleFilter && vehicleHistory.length===0 && <div className="text-center py-8 text-slate-400 text-sm">No se encontraron registros</div>}
            {vehicleHistory.sort((a,b)=>(b.date?.seconds||0)-(a.date?.seconds||0)).map(rep=>(
              <div key={rep.id} className="card p-4">
                <div className="flex justify-between items-start mb-1">
                  <h4 className="font-bold">{rep.vehicle} <span className="font-mono text-sm text-slate-400">{rep.plate}</span></h4>
                  <p className="font-black text-green-600">${rep.totalCost?.toLocaleString()}</p>
                </div>
                <div className="flex gap-3 text-xs text-slate-400 mb-2">
                  {rep.km && <span>🔢 {Number(rep.km).toLocaleString()} km</span>}
                  {rep.date?.seconds && <span>📅 {new Date(rep.date.seconds*1000).toLocaleDateString('es-AR')}</span>}
                </div>
                <p className="text-sm text-slate-600">{rep.description}</p>
              </div>
            ))}
            {!vehicleFilter && <div className="text-center py-16 text-slate-400"><Clock size={36} className="mx-auto mb-3 opacity-30"/><p className="text-sm">Escribí una patente para ver el historial</p></div>}
          </div>
        )}

        {/* AGREGAR REPUESTO */}
        {view==='add' && (
          <form onSubmit={addProduct} className="card p-5 space-y-4 max-w-md mx-auto">
            <div className="flex items-center gap-3">
              <button type="button" onClick={()=>setView('list')} className="p-2 bg-slate-100 rounded-xl"><ChevronLeft size={18}/></button>
              <h2 className="text-xl font-black">Nuevo Repuesto</h2>
            </div>
            <div><span className="lbl">Nombre *</span><input className="inp" required placeholder="Filtro de aceite" value={newProduct.name} onChange={e=>setNewProduct({...newProduct,name:e.target.value})}/></div>
            <div><span className="lbl">Ubicación</span><input className="inp" placeholder="Estante A, Cajón 2" value={newProduct.location} onChange={e=>setNewProduct({...newProduct,location:e.target.value})}/></div>
            <div><span className="lbl">URL de foto (opcional)</span><input className="inp" placeholder="https://..." value={newProduct.imageUrl} onChange={e=>setNewProduct({...newProduct,imageUrl:e.target.value})}/></div>
            <div className="grid grid-cols-3 gap-3">
              <div><span className="lbl">Costo $</span><input className="inp" type="number" min="0" value={newProduct.cost} onChange={e=>setNewProduct({...newProduct,cost:e.target.value})}/></div>
              <div><span className="lbl">Stock</span><input className="inp" type="number" min="0" value={newProduct.quantity} onChange={e=>setNewProduct({...newProduct,quantity:e.target.value})}/></div>
              <div><span className="lbl">Mínimo</span><input className="inp" type="number" min="0" value={newProduct.minStock} onChange={e=>setNewProduct({...newProduct,minStock:e.target.value})}/></div>
            </div>
            <button type="submit" className="btn"><Save size={17}/>Guardar Repuesto</button>
          </form>
        )}

        {/* ESCÁNER */}
        {view==='scan' && (
          <div className="fixed inset-0 bg-slate-950 z-[100] flex flex-col items-center justify-center p-6 text-white">
            <button onClick={()=>{setIsScanning(false);setView('dashboard');}} className="absolute top-6 right-6 p-3 bg-white/10 rounded-full"><X size={26}/></button>
            <div id="qr-reader" className="w-full max-w-xs aspect-square border-4 border-blue-500 rounded-2xl overflow-hidden bg-slate-900"/>
            <p className="mt-8 text-xl font-black animate-pulse">Buscando QR...</p>
          </div>
        )}

        {/* ASISTENTE IA */}
        {view==='ai_assistant' && (
          <div className="card p-5 space-y-4 max-w-xl mx-auto">
            <h2 className="text-2xl font-black flex items-center gap-2"><Sparkles className="text-yellow-500"/>Asistente Gemini</h2>
            <p className="text-slate-500 text-sm">Describí el problema y Gemini te ayuda con el diagnóstico.</p>
            <textarea className="inp h-32 resize-none" placeholder="Ej: Ford Focus 2012, ruido al frenar, vibración en el volante..." value={diagnosisQuery} onChange={e=>setDiagnosisQuery(e.target.value)}/>
            <button onClick={()=>askGemini(`Soy mecánico. Problema: ${diagnosisQuery}. Dame diagnóstico probable, pasos a seguir y repuestos necesarios.`)} disabled={aiLoading||!diagnosisQuery.trim()} className="btn disabled:opacity-50">
              {aiLoading?<><Loader2 className="animate-spin" size={17}/>Analizando...</>:<><Sparkles size={17}/>Consultar Gemini</>}
            </button>
            {aiResponse && <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm leading-relaxed whitespace-pre-wrap text-slate-700">{aiResponse}</div>}
          </div>
        )}
      </main>

      {/* Menú móvil */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-1 py-2 flex justify-around items-center z-50">
        <button onClick={()=>setView('dashboard')} className={`flex flex-col items-center gap-0.5 px-2 ${view==='dashboard'?'text-blue-600':'text-slate-400'}`}><LayoutDashboard size={20}/><span className="text-[9px] font-bold">Panel</span></button>
        <button onClick={()=>setView('list')} className={`flex flex-col items-center gap-0.5 px-2 ${view==='list'?'text-blue-600':'text-slate-400'}`}><Box size={20}/><span className="text-[9px] font-bold">Stock</span></button>
        <button onClick={()=>{setView('scan');setIsScanning(true);}} className="bg-blue-600 text-white p-3.5 rounded-full -mt-6 shadow-xl border-4 border-slate-100"><Camera size={22}/></button>
        <button onClick={()=>setView('repairs')} className={`flex flex-col items-center gap-0.5 px-2 ${view==='repairs'?'text-blue-600':'text-slate-400'}`}><Car size={20}/><span className="text-[9px] font-bold">Servicios</span></button>
        <button onClick={()=>setView('budgets')} className={`flex flex-col items-center gap-0.5 px-2 ${view==='budgets'?'text-blue-600':'text-slate-400'}`}><FileText size={20}/><span className="text-[9px] font-bold">Presupuestos</span></button>
      </nav>
    </div>
  );
}

function PartSelector({ inventory, parts, onChange }) {
  const [search, setSearch] = useState('');
  return (
    <div className="space-y-2">
      <span className="lbl">Repuestos</span>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14}/>
        <input className="inp pl-9 text-sm" placeholder="Buscar repuesto para agregar..." value={search} onChange={e=>setSearch(e.target.value)}/>
      </div>
      {search && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-lg max-h-36 overflow-y-auto">
          {inventory.filter(i=>i.name.toLowerCase().includes(search.toLowerCase())&&i.quantity>0&&!parts.find(p=>p.id===i.id)).map(i=>(
            <div key={i.id} onClick={()=>{onChange([...parts,{id:i.id,name:i.name,qty:1,cost:i.cost}]);setSearch('');}}
              className="p-3 hover:bg-blue-50 cursor-pointer text-sm flex justify-between border-b border-slate-100 last:border-0">
              <span className="font-bold">{i.name}</span><span className="text-slate-400 text-xs">Stock: {i.quantity}</span>
            </div>
          ))}
          {inventory.filter(i=>i.name.toLowerCase().includes(search.toLowerCase())).length===0 && <p className="p-3 text-slate-400 text-sm text-center">No encontrado</p>}
        </div>
      )}
      {parts.length>0 && (
        <div className="space-y-1.5">
          {parts.map((p,idx)=>(
            <div key={idx} className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2">
              <span className="text-sm font-bold flex-1">{p.name}</span>
              <input type="number" min="1" value={p.qty} onChange={e=>{const np=[...parts];np[idx].qty=Number(e.target.value);onChange(np);}} className="inp w-14 text-center text-sm py-1 px-2" style={{width:'3.5rem'}}/>
              <span className="text-xs text-slate-500 w-20 text-right">${(p.cost*p.qty).toLocaleString()}</span>
              <button type="button" onClick={()=>onChange(parts.filter((_,i)=>i!==idx))} className="text-red-400 hover:text-red-600"><X size={14}/></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
