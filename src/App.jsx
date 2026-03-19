import React, { useState, useEffect, useCallback, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getFirestore, collection, doc, onSnapshot,
  updateDoc, deleteDoc, query, addDoc, serverTimestamp, writeBatch
} from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import {
  Plus, Search, MapPin, MinusCircle, PlusCircle, Camera, Trash2, X,
  ChevronLeft, LayoutDashboard, Box, Check, Sparkles, Wrench, Car,
  DollarSign, Save, Printer, Loader2, AlertCircle, Users, FileText,
  Clock, TrendingUp, Bell, Image, ChevronDown, CheckCircle, 
  AlertTriangle, Package, Zap, BarChart3, Edit3
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

const TALLER_INFO = {
  nombre: "Taller CheCk",
  direccion: "Tu dirección acá",
  telefono: "3329677336",
  email: "tu@email.com"
};

const STATUS_CONFIG = {
  pendiente: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-400' },
  en_proceso: { label: 'En proceso', color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-400' },
  listo: { label: 'Listo', color: 'bg-green-100 text-green-700', dot: 'bg-green-400' },
  entregado: { label: 'Entregado', color: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' },
};

export default function App() {
  const [user, setUser] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [repairs, setRepairs] = useState([]);
  const [clients, setClients] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [view, setView] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [globalSearch, setGlobalSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  const [diagnosisQuery, setDiagnosisQuery] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState('');
  const [statsMonth, setStatsMonth] = useState(new Date().getMonth());
  const videoRef = useRef(null);
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraTarget, setCameraTarget] = useState(null); // 'product' | 'repair'
  const [capturedPhoto, setCapturedPhoto] = useState(null);

  const [newProduct, setNewProduct] = useState({ name: '', sku: '', location: '', quantity: 0, minStock: 1, cost: 0, imageUrl: '' });
  const [newRepair, setNewRepair] = useState({ vehicle: '', plate: '', km: '', clientId: '', clientName: '', description: '', partsUsed: [], laborCost: 0, status: 'pendiente', imageUrl: '', notes: '' });
  const [newClient, setNewClient] = useState({ name: '', phone: '', email: '', vehicles: [] });
  const [newVehicle, setNewVehicle] = useState({ make: '', model: '', year: '', plate: '', km: '' });
  const [newBudget, setNewBudget] = useState({ clientId: '', clientName: '', clientPhone: '', vehicle: '', plate: '', km: '', description: '', partsUsed: [], laborCost: 0, notes: '', date: new Date().toISOString().split('T')[0] });
  const [clientSearch, setClientSearch] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);

  const showNotification = useCallback((msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  }, []);

  useEffect(() => {
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

  // Camera
  const startCamera = async (target) => {
    setCameraTarget(target);
    setCapturedPhoto(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setCameraStream(stream);
      setView('camera');
    } catch { showNotification("No se pudo acceder a la cámara", "error"); }
  };

  useEffect(() => {
    if (view === 'camera' && cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
    }
    if (view !== 'camera' && cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop());
      setCameraStream(null);
    }
  }, [view, cameraStream]);

  const capturePhoto = () => {
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setCapturedPhoto(dataUrl);
  };

  const confirmPhoto = () => {
    if (cameraTarget === 'product') setNewProduct(p => ({ ...p, imageUrl: capturedPhoto }));
    if (cameraTarget === 'repair') setNewRepair(r => ({ ...r, imageUrl: capturedPhoto }));
    setView(cameraTarget === 'product' ? 'add' : 'add_repair');
    setCapturedPhoto(null);
  };

  // Client linking
  const selectClient = (client, formType) => {
    if (formType === 'repair') {
      setNewRepair(r => ({ ...r, clientId: client.id, clientName: client.name }));
    } else {
      setNewBudget(b => ({ ...b, clientId: client.id, clientName: client.name, clientPhone: client.phone || '' }));
    }
    setClientSearch(client.name);
    setShowClientDropdown(false);
  };

  const selectVehicle = (vehicle, formType) => {
    if (formType === 'repair') {
      setNewRepair(r => ({ ...r, vehicle: `${vehicle.make} ${vehicle.model} ${vehicle.year}`.trim(), plate: vehicle.plate || '', km: vehicle.km || '' }));
    } else {
      setNewBudget(b => ({ ...b, vehicle: `${vehicle.make} ${vehicle.model} ${vehicle.year}`.trim(), plate: vehicle.plate || '', km: vehicle.km || '' }));
    }
  };

  const selectedClientVehicles = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client?.vehicles || [];
  };

  // Gemini
  const askClaude = async (prompt) => {
    setAiLoading(true); setAiResponse('');
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: "Sos un experto jefe de taller mecánico argentino. Respondé en español rioplatense, claro y práctico.",
          messages: [{ role: "user", content: prompt }]
        })
      });
      const data = await res.json();
      const text = data.content?.map(b => b.text || '').join('') || "Sin respuesta";
      setAiResponse(text);
    } catch { showNotification("Error con la IA", "error"); }
    finally { setAiLoading(false); }
  };

  // CRUD
  const addProduct = async (e) => {
    e.preventDefault();
    const sku = newProduct.sku || `REP-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'inventory'), {
        ...newProduct, sku, quantity: Number(newProduct.quantity), cost: Number(newProduct.cost), minStock: Number(newProduct.minStock), createdAt: serverTimestamp()
      });
      setNewProduct({ name: '', sku: '', location: '', quantity: 0, minStock: 1, cost: 0, imageUrl: '' });
      setView('list'); showNotification("✓ Repuesto guardado");
    } catch { showNotification("Error al guardar", "error"); }
  };

  const finishRepair = async (e) => {
    e.preventDefault();
    const batch = writeBatch(db);
    const ref = doc(collection(db, 'artifacts', appId, 'public', 'data', 'repairs'));
    const partsCost = newRepair.partsUsed.reduce((s, p) => s + (p.cost * p.qty), 0);
    const total = partsCost + Number(newRepair.laborCost);
    batch.set(ref, { ...newRepair, date: serverTimestamp(), totalCost: total, partsCost, laborCost: Number(newRepair.laborCost) });
    newRepair.partsUsed.forEach(part => {
      const original = inventory.find(i => i.id === part.id);
      if (original) batch.update(doc(db, 'artifacts', appId, 'public', 'data', 'inventory', part.id), { quantity: Math.max(0, original.quantity - part.qty) });
    });
    await batch.commit();
    setNewRepair({ vehicle: '', plate: '', km: '', clientId: '', clientName: '', description: '', partsUsed: [], laborCost: 0, status: 'pendiente', imageUrl: '', notes: '' });
    setClientSearch('');
    setView('repairs'); showNotification("✓ Servicio registrado");
  };

  const saveBudget = async (e) => {
    e.preventDefault();
    const partsCost = newBudget.partsUsed.reduce((s, p) => s + (p.cost * p.qty), 0);
    const total = partsCost + Number(newBudget.laborCost);
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'budgets'), {
        ...newBudget, createdAt: serverTimestamp(), totalCost: total, partsCost, laborCost: Number(newBudget.laborCost)
      });
      setNewBudget({ clientId: '', clientName: '', clientPhone: '', vehicle: '', plate: '', km: '', description: '', partsUsed: [], laborCost: 0, notes: '', date: new Date().toISOString().split('T')[0] });
      setClientSearch('');
      setView('budgets'); showNotification("✓ Presupuesto guardado");
    } catch { showNotification("Error al guardar", "error"); }
  };

  const addClient = async (e) => {
    e.preventDefault();
    try {
      const vehicles = newClient.vehicles.length > 0 ? newClient.vehicles : [];
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'clients'), { ...newClient, vehicles, createdAt: serverTimestamp() });
      setNewClient({ name: '', phone: '', email: '', vehicles: [] });
      setNewVehicle({ make: '', model: '', year: '', plate: '', km: '' });
      setView('clients'); showNotification("✓ Cliente guardado");
    } catch { showNotification("Error al guardar", "error"); }
  };

  const addVehicleToForm = () => {
    if (!newVehicle.make) return;
    setNewClient(c => ({ ...c, vehicles: [...c.vehicles, { ...newVehicle }] }));
    setNewVehicle({ make: '', model: '', year: '', plate: '', km: '' });
  };

  const updateRepairStatus = async (id, status) => {
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'repairs', id), { status });
    showNotification("✓ Estado actualizado");
  };

  const updateStock = async (id, delta) => {
    const item = inventory.find(i => i.id === id);
    if (!item) return;
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'inventory', id), { quantity: Math.max(0, item.quantity + delta) });
  };

  const deleteItem = async (colName, id) => {
    if (!window.confirm("¿Eliminar?")) return;
    await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', colName, id));
    showNotification("Eliminado");
  };

  const printBudget = (budget) => {
    const win = window.open('', '_blank');
    const dateStr = budget.date ? new Date(budget.date + 'T12:00:00').toLocaleDateString('es-AR') : new Date().toLocaleDateString('es-AR');
    win.document.write(`<html><head><title>Presupuesto - ${budget.clientName}</title>
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:'Segoe UI',Arial,sans-serif;padding:35px;color:#1e293b;background:#fff;max-width:820px;margin:0 auto}
      .header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:24px;margin-bottom:24px;border-bottom:3px solid #0f172a}
      .logo-area h1{font-size:28px;font-weight:900;color:#0f172a;letter-spacing:-0.5px}
      .logo-area p{font-size:12px;color:#64748b;margin-top:4px;line-height:1.5}
      .doc-info{text-align:right}
      .doc-info h2{font-size:20px;font-weight:800;color:#0f172a;text-transform:uppercase;letter-spacing:2px}
      .doc-info p{font-size:12px;color:#64748b;margin-top:4px}
      .section{margin:20px 0}
      .section-title{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;color:#94a3b8;margin-bottom:10px}
      .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
      .info-item label{font-size:10px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;display:block;margin-bottom:2px}
      .info-item span{font-size:14px;font-weight:700;color:#0f172a}
      table{width:100%;border-collapse:collapse;margin-top:8px}
      thead tr{background:#0f172a;color:#fff}
      th{padding:10px 12px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px}
      td{padding:10px 12px;font-size:13px;border-bottom:1px solid #f1f5f9}
      tr:nth-child(even) td{background:#f8fafc}
      .labor-row td{background:#f1f5f9;font-weight:700}
      .total-box{background:#0f172a;color:#fff;padding:16px 20px;border-radius:10px;display:flex;justify-content:space-between;align-items:center;margin-top:20px}
      .total-box span:first-child{font-size:13px;font-weight:600;opacity:0.7;text-transform:uppercase;letter-spacing:1px}
      .total-box span:last-child{font-size:24px;font-weight:900}
      .notes-box{background:#fefce8;border:1px solid #fde68a;padding:14px;border-radius:8px;font-size:13px;color:#713f12;margin-top:16px}
      .footer{margin-top:32px;padding-top:16px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center}
      .footer p{font-size:11px;color:#94a3b8}
      .validity{background:#f1f5f9;padding:6px 12px;border-radius:20px;font-size:11px;font-weight:700;color:#475569}
    </style></head><body>
    <div class="header">
      <div class="logo-area"><h1>${TALLER_INFO.nombre}</h1><p>${TALLER_INFO.direccion}<br>${TALLER_INFO.telefono} · ${TALLER_INFO.email}</p></div>
      <div class="doc-info"><h2>Presupuesto</h2><p>Fecha: ${dateStr}</p></div>
    </div>
    <div class="section"><div class="section-title">Cliente</div>
      <div class="info-grid">
        <div class="info-item"><label>Nombre</label><span>${budget.clientName}</span></div>
        <div class="info-item"><label>Teléfono</label><span>${budget.clientPhone || '—'}</span></div>
      </div>
    </div>
    <div class="section"><div class="section-title">Vehículo</div>
      <div class="info-grid">
        <div class="info-item"><label>Vehículo</label><span>${budget.vehicle}</span></div>
        <div class="info-item"><label>Patente</label><span>${budget.plate || '—'}</span></div>
        ${budget.km ? `<div class="info-item"><label>Kilometraje</label><span>${Number(budget.km).toLocaleString()} km</span></div>` : ''}
      </div>
    </div>
    ${budget.description ? `<div class="section"><div class="section-title">Trabajo a realizar</div><p style="font-size:14px;color:#334155;line-height:1.6">${budget.description}</p></div>` : ''}
    <div class="section"><div class="section-title">Detalle de materiales y mano de obra</div>
      <table><thead><tr><th>Descripción</th><th>Cant.</th><th>Precio unit.</th><th>Subtotal</th></tr></thead><tbody>
        ${budget.partsUsed?.map(p => `<tr><td>${p.name}</td><td>${p.qty}</td><td>$${Number(p.cost).toLocaleString()}</td><td>$${(p.cost * p.qty).toLocaleString()}</td></tr>`).join('')}
        <tr class="labor-row"><td colspan="3">Mano de obra</td><td>$${Number(budget.laborCost).toLocaleString()}</td></tr>
      </tbody></table>
    </div>
    <div class="total-box"><span>Total del presupuesto</span><span>$${budget.totalCost?.toLocaleString()}</span></div>
    ${budget.notes ? `<div class="notes-box">📝 ${budget.notes}</div>` : ''}
    <div class="footer"><p>${TALLER_INFO.nombre} · ${TALLER_INFO.telefono}</p><span class="validity">Válido por 15 días</span></div>
    </body></html>`);
    win.document.close(); win.print();
  };

  const printQRLabel = (product) => {
    const win = window.open('', '_blank');
    win.document.write(`<html><head><title>Etiqueta</title>
    <style>body{display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#fff}
    .label{width:5cm;height:5cm;display:flex;flex-direction:column;align-items:center;justify-content:center;border:1px solid #000;padding:4px;font-family:Arial,sans-serif}
    .name{font-size:7px;font-weight:bold;text-align:center;margin-bottom:2px;text-transform:uppercase;max-width:100%;overflow:hidden}
    .sku{font-size:5px;color:#666;margin-top:2px}
    </style></head><body>
    <div class="label">
      <div class="name">${product.name}</div>
      <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${product.sku}" style="width:3cm;height:3cm"/>
      <div class="sku">${product.sku}</div>
    </div>
    <script>window.onload=()=>{window.print();}</script>
    </body></html>`);
    win.document.close();
  };

  // Stats
  const monthRepairs = repairs.filter(r => {
    if (!r.date?.seconds) return false;
    return new Date(r.date.seconds * 1000).getMonth() === statsMonth;
  });
  const monthRevenue = monthRepairs.reduce((s, r) => s + (r.totalCost || 0), 0);
  const monthBudgets = budgets.filter(b => {
    if (!b.createdAt?.seconds) return false;
    return new Date(b.createdAt.seconds * 1000).getMonth() === statsMonth;
  });

  // Global search results
  const globalResults = globalSearch.length > 1 ? {
    inventory: inventory.filter(i => i.name?.toLowerCase().includes(globalSearch.toLowerCase())),
    repairs: repairs.filter(r => r.vehicle?.toLowerCase().includes(globalSearch.toLowerCase()) || r.plate?.toLowerCase().includes(globalSearch.toLowerCase()) || r.clientName?.toLowerCase().includes(globalSearch.toLowerCase())),
    clients: clients.filter(c => c.name?.toLowerCase().includes(globalSearch.toLowerCase()) || c.phone?.includes(globalSearch)),
    budgets: budgets.filter(b => b.clientName?.toLowerCase().includes(globalSearch.toLowerCase()) || b.vehicle?.toLowerCase().includes(globalSearch.toLowerCase())),
  } : null;

  const vehicleHistory = repairs.filter(r =>
    vehicleFilter && (r.plate?.toLowerCase().includes(vehicleFilter.toLowerCase()) || r.vehicle?.toLowerCase().includes(vehicleFilter.toLowerCase()))
  );

  const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
      <div className="relative"><Loader2 className="animate-spin text-orange-500" size={56}/></div>
      <p className="font-black text-xl mt-4 tracking-tight">TallerMaster</p>
      <p className="text-slate-500 text-sm mt-1">Iniciando sistema...</p>
    </div>
  );

  return (
    <div className="min-h-screen text-slate-900 font-sans pb-24 md:pb-0 md:pl-64" style={{background:'#f0f2f5'}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=DM+Sans:wght@400;500;600;700&display=swap');
        * { font-family: 'DM Sans', sans-serif; }
        h1,h2,.font-display { font-family: 'Syne', sans-serif; }
        .glass { background: rgba(255,255,255,0.85); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.9); }
        .card { background: white; border-radius: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.06), 0 0 1px rgba(0,0,0,0.08); }
        .card-hover { transition: all 0.2s; }
        .card-hover:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.1); }
        .inp { background: #f8fafc; border: 1.5px solid #e8ecf0; border-radius: 12px; padding: 11px 14px; width: 100%; outline: none; transition: all 0.2s; font-size: 14px; }
        .inp:focus { border-color: #f97316; background: white; box-shadow: 0 0 0 3px rgba(249,115,22,0.1); }
        .btn-orange { background: linear-gradient(135deg, #f97316, #ea580c); color: white; padding: 13px 20px; border-radius: 14px; font-weight: 700; display: flex; align-items: center; gap: 8px; justify-content: center; cursor: pointer; border: none; width: 100%; font-size: 15px; letter-spacing: -0.2px; box-shadow: 0 4px 14px rgba(249,115,22,0.35); transition: all 0.2s; }
        .btn-orange:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(249,115,22,0.4); }
        .btn-orange:disabled { opacity: 0.5; transform: none; }
        .btn-dark { background: #0f172a; color: white; padding: 10px 16px; border-radius: 12px; font-weight: 700; display: flex; align-items: center; gap: 6px; justify-content: center; cursor: pointer; border: none; font-size: 13px; transition: all 0.2s; }
        .btn-dark:hover { background: #1e293b; }
        .btn-ghost { background: #f1f5f9; color: #475569; padding: 9px 14px; border-radius: 12px; font-weight: 600; display: flex; align-items: center; gap: 6px; cursor: pointer; border: none; font-size: 13px; transition: all 0.2s; }
        .btn-ghost:hover { background: #e2e8f0; }
        .lbl { font-size: 11px; font-weight: 700; color: #64748b; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 0.8px; display: block; }
        .status-badge { padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; display: inline-flex; align-items: center; gap: 5px; }
        .nav-item { width: 100%; display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: 12px; font-size: 13px; font-weight: 600; transition: all 0.15s; cursor: pointer; border: none; text-align: left; }
        .nav-item.active { background: linear-gradient(135deg, #f97316, #ea580c); color: white; box-shadow: 0 4px 12px rgba(249,115,22,0.3); }
        .nav-item:not(.active) { color: #94a3b8; }
        .nav-item:not(.active):hover { background: rgba(255,255,255,0.08); color: white; }
        .stat-card { border-radius: 20px; padding: 20px; position: relative; overflow: hidden; }
        .page-title { font-family: 'Syne', sans-serif; font-size: 26px; font-weight: 900; letter-spacing: -0.5px; }
        .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 4px; }
      `}</style>

      {/* SIDEBAR */}
      <nav className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-64 p-5 z-50" style={{background:'#0f172a'}}>
        <div className="flex items-center gap-3 mb-8 px-2">
          <div style={{background:'linear-gradient(135deg,#f97316,#ea580c)'}} className="p-2 rounded-xl">
            <Wrench size={20} className="text-white"/>
          </div>
          <div>
            <h1 className="text-white font-display font-black text-base leading-tight">TallerMaster</h1>
            <p className="text-slate-500 text-xs">{TALLER_INFO.nombre}</p>
          </div>
        </div>

        {/* Global search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14}/>
          <input className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl text-white placeholder-slate-500 outline-none focus:ring-1 focus:ring-orange-500" style={{background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.08)'}} placeholder="Buscar todo..." value={globalSearch} onChange={e=>setGlobalSearch(e.target.value)} onFocus={()=>setView('search')}/>
        </div>

        <div className="space-y-0.5 flex-1">
          {[
            {id:'dashboard',Icon:LayoutDashboard,label:'Panel'},
            {id:'list',Icon:Box,label:'Inventario'},
            {id:'repairs',Icon:Car,label:'Servicios'},
            {id:'budgets',Icon:FileText,label:'Presupuestos'},
            {id:'clients',Icon:Users,label:'Clientes'},
            {id:'history',Icon:Clock,label:'Historial'},
            {id:'stats',Icon:BarChart3,label:'Estadísticas'},
            {id:'ai_assistant',Icon:Sparkles,label:'Asistente IA'},
          ].map(({id,Icon,label})=>(
            <button key={id} onClick={()=>{setView(id);setGlobalSearch('');}} className={`nav-item ${view===id?'active':''}`}>
              <Icon size={16}/>{label}
            </button>
          ))}
        </div>

        <div className="mt-4 px-2">
          <div className="rounded-xl p-3 text-xs" style={{background:'rgba(255,255,255,0.05)'}}>
            <p className="font-bold text-slate-300 text-sm">{TALLER_INFO.nombre}</p>
            <p className="text-slate-500 mt-0.5">{TALLER_INFO.telefono}</p>
          </div>
        </div>
      </nav>

      <main className="p-4 md:p-6 max-w-4xl mx-auto">
        {/* Notification */}
        {notification && (
          <div className={`fixed bottom-28 md:bottom-6 right-4 ${notification.type==='error'?'bg-red-600':'bg-slate-900'} text-white px-5 py-3 rounded-2xl shadow-2xl z-[100] flex items-center gap-3 animate-bounce`} style={{animationIterationCount:1}}>
            {notification.type==='error'?<AlertCircle size={17}/>:<Check className="text-orange-400" size={17}/>}
            <span className="font-bold text-sm">{notification.msg}</span>
          </div>
        )}

        {/* DASHBOARD */}
        {view==='dashboard' && (
          <div className="space-y-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-500 text-sm font-medium">Bienvenido,</p>
                <h2 className="page-title">{TALLER_INFO.nombre}</h2>
              </div>
              <div className="flex gap-2">
                <button onClick={()=>setView('add_repair')} className="btn-orange" style={{width:'auto',padding:'10px 16px',fontSize:'13px'}}><Plus size={15}/>Servicio</button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                {label:'Repuestos',value:inventory.length,gradient:'from-blue-500 to-blue-600',Icon:Package},
                {label:'Servicios',value:repairs.length,gradient:'from-violet-500 to-violet-600',Icon:Car},
                {label:'Stock bajo',value:inventory.filter(p=>p.quantity<=p.minStock).length,gradient:'from-red-500 to-red-600',Icon:AlertTriangle},
                {label:'Clientes',value:clients.length,gradient:'from-emerald-500 to-emerald-600',Icon:Users},
              ].map(({label,value,gradient,Icon})=>(
                <div key={label} className={`stat-card bg-gradient-to-br ${gradient} text-white`}>
                  <Icon size={18} className="opacity-80 mb-2"/>
                  <p className="text-3xl font-black font-display">{value}</p>
                  <p className="text-xs font-semibold opacity-80 uppercase tracking-wide mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                {label:'Nuevo Servicio',Icon:Wrench,action:'add_repair',desc:'Registrar trabajo'},
                {label:'Presupuesto',Icon:FileText,action:'add_budget',desc:'Crear cotización'},
                {label:'Agregar Repuesto',Icon:Plus,action:'add',desc:'Sumar al stock'},
              ].map(({label,Icon,action,desc})=>(
                <button key={action} onClick={()=>setView(action)} className="card card-hover p-5 text-left flex items-center gap-4">
                  <div style={{background:'linear-gradient(135deg,#fff7ed,#ffedd5)'}} className="p-3 rounded-xl">
                    <Icon size={22} className="text-orange-500"/>
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">{label}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
                  </div>
                </button>
              ))}
            </div>

            {/* Servicios recientes */}
            {repairs.filter(r=>r.status!=='entregado').length>0 && (
              <div className="card p-5">
                <div className="section-header">
                  <p className="font-display font-bold text-slate-800">Servicios activos</p>
                  <button onClick={()=>setView('repairs')} className="text-xs text-orange-500 font-bold">Ver todos →</button>
                </div>
                <div className="space-y-3">
                  {repairs.filter(r=>r.status!=='entregado').slice(0,3).map(rep=>(
                    <div key={rep.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                      <div>
                        <p className="font-bold text-sm">{rep.vehicle} <span className="font-mono text-xs text-slate-400">{rep.plate}</span></p>
                        <p className="text-xs text-slate-400">{rep.clientName || 'Sin cliente'}</p>
                      </div>
                      <StatusBadge status={rep.status||'pendiente'}/>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {inventory.filter(p=>p.quantity<=p.minStock).length>0 && (
              <div className="card p-5 border-l-4 border-red-500">
                <p className="font-bold text-red-600 flex items-center gap-2 text-sm mb-3"><AlertTriangle size={15}/>Stock bajo — reponé estos artículos</p>
                {inventory.filter(p=>p.quantity<=p.minStock).map(p=>(
                  <div key={p.id} className="flex justify-between text-sm py-1.5 border-b border-slate-50 last:border-0">
                    <span className="font-medium">{p.name}</span><span className="font-bold text-red-500">{p.quantity} un.</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* BÚSQUEDA GLOBAL */}
        {view==='search' && globalSearch.length>1 && (
          <div className="space-y-5">
            <h2 className="page-title">Resultados para "{globalSearch}"</h2>
            {globalResults?.clients.length>0 && (
              <div className="card p-5">
                <p className="lbl mb-3">Clientes</p>
                {globalResults.clients.map(c=><div key={c.id} className="py-2 border-b border-slate-50 last:border-0"><p className="font-bold text-sm">{c.name}</p><p className="text-xs text-slate-400">{c.phone}</p></div>)}
              </div>
            )}
            {globalResults?.repairs.length>0 && (
              <div className="card p-5">
                <p className="lbl mb-3">Servicios</p>
                {globalResults.repairs.map(r=><div key={r.id} className="py-2 border-b border-slate-50 last:border-0 flex justify-between"><div><p className="font-bold text-sm">{r.vehicle} {r.plate}</p><p className="text-xs text-slate-400">{r.clientName}</p></div><StatusBadge status={r.status||'pendiente'}/></div>)}
              </div>
            )}
            {globalResults?.inventory.length>0 && (
              <div className="card p-5">
                <p className="lbl mb-3">Repuestos</p>
                {globalResults.inventory.map(i=><div key={i.id} className="py-2 border-b border-slate-50 last:border-0 flex justify-between"><p className="font-bold text-sm">{i.name}</p><span className={`text-xs font-bold ${i.quantity<=i.minStock?'text-red-500':'text-green-600'}`}>{i.quantity} un.</span></div>)}
              </div>
            )}
            {Object.values(globalResults||{}).every(a=>a.length===0) && (
              <div className="card p-12 text-center text-slate-400">
                <Search size={36} className="mx-auto mb-3 opacity-30"/>
                <p>No se encontró nada para "{globalSearch}"</p>
              </div>
            )}
          </div>
        )}

        {/* INVENTARIO */}
        {view==='list' && (
          <div className="space-y-4">
            <div className="section-header">
              <h2 className="page-title">Inventario</h2>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14}/>
                  <input className="inp pl-9 text-sm" style={{width:'200px'}} placeholder="Buscar..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}/>
                </div>
                <button onClick={()=>setView('add')} className="btn-orange" style={{width:'auto',padding:'10px 14px',fontSize:'13px'}}><Plus size={15}/></button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {inventory.filter(p=>p.name.toLowerCase().includes(searchTerm.toLowerCase())).map(item=>(
                <div key={item.id} onClick={()=>{setSelectedProduct(item);setView('details');}} className="card card-hover p-4 cursor-pointer">
                  {item.imageUrl && <img src={item.imageUrl} alt={item.name} className="w-full h-28 object-cover rounded-xl mb-3"/>}
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-sm flex-1 pr-2">{item.name}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 ${item.quantity<=item.minStock?'bg-red-100 text-red-600':'bg-emerald-100 text-emerald-700'}`}>{item.quantity} un.</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1"><MapPin size={10}/>{item.location||'Sin ubicación'}</p>
                  <p className="text-base font-black text-slate-800 mt-1">${Number(item.cost).toLocaleString()}</p>
                </div>
              ))}
              {inventory.length===0 && <div className="col-span-3 card p-16 text-center text-slate-400"><Package size={40} className="mx-auto mb-3 opacity-20"/><p className="font-medium">Sin repuestos aún</p><button onClick={()=>setView('add')} className="btn-orange mt-4" style={{width:'auto',margin:'16px auto 0'}}>Agregar primero</button></div>}
            </div>
          </div>
        )}

        {/* DETALLE REPUESTO */}
        {view==='details' && selectedProduct && (
          <div className="card overflow-hidden max-w-sm mx-auto">
            <div className="p-6 text-white relative" style={{background:'linear-gradient(135deg,#0f172a,#1e293b)'}}>
              <button onClick={()=>setView('list')} className="absolute top-4 left-4 p-1.5 rounded-xl" style={{background:'rgba(255,255,255,0.1)'}}>
                <ChevronLeft size={18} className="text-white"/>
              </button>
              <button onClick={()=>{deleteItem('inventory',selectedProduct.id);setView('list');}} className="absolute top-4 right-4 p-1.5 rounded-xl text-red-400" style={{background:'rgba(239,68,68,0.15)'}}>
                <Trash2 size={16}/>
              </button>
              {selectedProduct.imageUrl
                ? <img src={selectedProduct.imageUrl} alt={selectedProduct.name} className="w-full h-36 object-cover rounded-xl mb-4 mt-2"/>
                : <div className="w-full h-20 rounded-xl mb-4 mt-8 flex items-center justify-center" style={{background:'rgba(255,255,255,0.05)'}}><Package size={32} className="text-slate-600"/></div>
              }
              <h2 className="font-display font-black text-xl uppercase text-center">{selectedProduct.name}</h2>
              <p className="text-orange-400 font-mono text-xs text-center mt-1">{selectedProduct.sku}</p>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl p-4 text-center" style={{background:'#f8fafc'}}>
                  <p className={`text-4xl font-black font-display ${selectedProduct.quantity<=selectedProduct.minStock?'text-red-500':'text-slate-800'}`}>{selectedProduct.quantity}</p>
                  <p className="text-xs font-bold text-slate-400 uppercase mt-1">Stock actual</p>
                </div>
                <div className="rounded-2xl p-4 text-center" style={{background:'#f8fafc'}}>
                  <p className="text-2xl font-black font-display">${Number(selectedProduct.cost).toLocaleString()}</p>
                  <p className="text-xs font-bold text-slate-400 uppercase mt-1">Costo</p>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-2xl p-3" style={{background:'#f8fafc'}}>
                <button onClick={()=>updateStock(selectedProduct.id,-1)} className="p-2.5 bg-white shadow-sm rounded-xl"><MinusCircle className="text-red-400" size={20}/></button>
                <span className="font-bold text-sm text-slate-600">Ajustar stock</span>
                <button onClick={()=>updateStock(selectedProduct.id,1)} className="p-2.5 bg-white shadow-sm rounded-xl"><PlusCircle className="text-emerald-500" size={20}/></button>
              </div>
              <div className="text-center pt-2 border-t border-slate-100">
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${selectedProduct.sku}`} className="w-28 h-28 mx-auto rounded-xl border p-1" alt="QR"/>
                <button onClick={()=>printQRLabel(selectedProduct)} className="btn-ghost mt-3 mx-auto" style={{width:'auto'}}>
                  <Printer size={15}/>Imprimir etiqueta
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SERVICIOS */}
        {view==='repairs' && (
          <div className="space-y-4">
            <div className="section-header">
              <h2 className="page-title">Servicios</h2>
              <button onClick={()=>setView('add_repair')} className="btn-orange" style={{width:'auto',padding:'10px 16px',fontSize:'13px'}}><Plus size={15}/>Nuevo</button>
            </div>
            {/* Filtro por estado */}
            <div className="flex gap-2 flex-wrap">
              {Object.entries(STATUS_CONFIG).map(([key,cfg])=>(
                <span key={key} className={`status-badge cursor-pointer ${cfg.color}`} onClick={()=>{}}>
                  <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`}/>
                  {cfg.label} ({repairs.filter(r=>(r.status||'pendiente')===key).length})
                </span>
              ))}
            </div>
            <div className="space-y-3">
              {repairs.sort((a,b)=>(b.date?.seconds||0)-(a.date?.seconds||0)).map(rep=>(
                <div key={rep.id} className="card p-5">
                  {rep.imageUrl && <img src={rep.imageUrl} alt="Vehículo" className="w-full h-32 object-cover rounded-xl mb-3"/>}
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold">{rep.vehicle}</h4>
                        {rep.plate && <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded-md text-slate-500">{rep.plate}</span>}
                        <StatusBadge status={rep.status||'pendiente'}/>
                      </div>
                      <div className="flex gap-3 text-xs text-slate-400 mt-1 flex-wrap">
                        {rep.clientName && <span className="flex items-center gap-1"><Users size={10}/>{rep.clientName}</span>}
                        {rep.km && <span>🔢 {Number(rep.km).toLocaleString()} km</span>}
                        {rep.date?.seconds && <span>📅 {new Date(rep.date.seconds*1000).toLocaleDateString('es-AR')}</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-emerald-600 text-lg">${rep.totalCost?.toLocaleString()}</p>
                      {rep.laborCost>0 && <p className="text-xs text-slate-400">MO: ${Number(rep.laborCost).toLocaleString()}</p>}
                    </div>
                  </div>
                  {rep.description && <p className="text-sm text-slate-500 italic mb-3">{rep.description}</p>}
                  {rep.notes && <p className="text-xs text-slate-400 bg-slate-50 rounded-xl p-2 mb-3">📝 {rep.notes}</p>}
                  <div className="flex items-center justify-between">
                    <div className="flex flex-wrap gap-1">
                      {rep.partsUsed?.map((p,i)=><span key={i} className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[10px] font-bold">{p.qty}x {p.name}</span>)}
                    </div>
                    <div className="flex gap-1 ml-2">
                      {Object.keys(STATUS_CONFIG).map(s=>(
                        <button key={s} onClick={()=>updateRepairStatus(rep.id,s)} className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-all ${(rep.status||'pendiente')===s?'bg-slate-800 text-white':'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                          {STATUS_CONFIG[s].label.split(' ')[0]}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
              {repairs.length===0 && <div className="card p-16 text-center text-slate-400"><Car size={40} className="mx-auto mb-3 opacity-20"/><p>No hay servicios</p></div>}
            </div>
          </div>
        )}

        {/* NUEVO SERVICIO */}
        {view==='add_repair' && (
          <form onSubmit={finishRepair} className="card p-6 space-y-4 max-w-xl mx-auto">
            <div className="flex items-center gap-3">
              <button type="button" onClick={()=>setView('repairs')} className="p-2 rounded-xl bg-slate-100"><ChevronLeft size={18}/></button>
              <h2 className="font-display font-black text-xl">Nuevo Servicio</h2>
            </div>

            {/* Cliente vinculado */}
            <div className="relative">
              <span className="lbl">Cliente</span>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15}/>
                <input className="inp pl-9" placeholder="Buscar cliente..." value={clientSearch}
                  onChange={e=>{setClientSearch(e.target.value);setShowClientDropdown(true);}}
                  onFocus={()=>setShowClientDropdown(true)}/>
              </div>
              {showClientDropdown && clientSearch && (
                <div className="absolute z-20 w-full bg-white border border-slate-200 rounded-xl shadow-xl mt-1 max-h-40 overflow-y-auto">
                  {clients.filter(c=>c.name.toLowerCase().includes(clientSearch.toLowerCase())).map(c=>(
                    <div key={c.id} onClick={()=>selectClient(c,'repair')} className="p-3 hover:bg-orange-50 cursor-pointer border-b border-slate-50 last:border-0">
                      <p className="font-bold text-sm">{c.name}</p>
                      <p className="text-xs text-slate-400">{c.phone}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Vehículos del cliente */}
            {newRepair.clientId && selectedClientVehicles(newRepair.clientId).length>0 && (
              <div>
                <span className="lbl">Vehículos del cliente</span>
                <div className="flex gap-2 flex-wrap">
                  {selectedClientVehicles(newRepair.clientId).map((v,i)=>(
                    <button key={i} type="button" onClick={()=>selectVehicle(v,'repair')}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border-2 transition-all ${newRepair.plate===v.plate?'border-orange-500 bg-orange-50 text-orange-700':'border-slate-200 bg-slate-50 text-slate-600'}`}>
                      {v.make} {v.model} · {v.plate}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div><span className="lbl">Vehículo *</span><input className="inp" required placeholder="Toyota Corolla" value={newRepair.vehicle} onChange={e=>setNewRepair({...newRepair,vehicle:e.target.value})}/></div>
              <div><span className="lbl">Patente</span><input className="inp uppercase font-mono" placeholder="ABC123" value={newRepair.plate} onChange={e=>setNewRepair({...newRepair,plate:e.target.value.toUpperCase()})}/></div>
              <div><span className="lbl">Kilometraje</span><input className="inp" type="number" placeholder="75000" value={newRepair.km} onChange={e=>setNewRepair({...newRepair,km:e.target.value})}/></div>
              <div><span className="lbl">Mano de obra $</span><input className="inp" type="number" min="0" value={newRepair.laborCost} onChange={e=>setNewRepair({...newRepair,laborCost:e.target.value})}/></div>
            </div>
            <div><span className="lbl">Estado</span>
              <div className="flex gap-2 flex-wrap">
                {Object.entries(STATUS_CONFIG).map(([key,cfg])=>(
                  <button key={key} type="button" onClick={()=>setNewRepair({...newRepair,status:key})}
                    className={`status-badge cursor-pointer border-2 transition-all ${newRepair.status===key?'border-orange-500':'border-transparent'} ${cfg.color}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`}/>{cfg.label}
                  </button>
                ))}
              </div>
            </div>
            <div><span className="lbl">Descripción del trabajo</span><textarea className="inp h-20 resize-none" placeholder="Qué se hizo..." value={newRepair.description} onChange={e=>setNewRepair({...newRepair,description:e.target.value})}/></div>
            <div><span className="lbl">Notas internas</span><input className="inp" placeholder="Observaciones, próximo servicio..." value={newRepair.notes} onChange={e=>setNewRepair({...newRepair,notes:e.target.value})}/></div>
            
            {/* Foto */}
            <div>
              <span className="lbl">Foto del vehículo</span>
              <div className="flex gap-2">
                <button type="button" onClick={()=>startCamera('repair')} className="btn-ghost flex-1"><Camera size={15}/>Tomar foto</button>
                {newRepair.imageUrl && <div className="relative"><img src={newRepair.imageUrl} className="h-10 w-16 object-cover rounded-xl" alt=""/><button type="button" onClick={()=>setNewRepair({...newRepair,imageUrl:''})} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5"><X size={10}/></button></div>}
              </div>
            </div>

            <PartSelector inventory={inventory} parts={newRepair.partsUsed} onChange={parts=>setNewRepair({...newRepair,partsUsed:parts})}/>
            {(newRepair.partsUsed.length>0||Number(newRepair.laborCost)>0) && (
              <div className="rounded-2xl p-4 text-sm font-bold text-emerald-700" style={{background:'#f0fdf4',border:'1px solid #bbf7d0'}}>
                💰 Total: ${(newRepair.partsUsed.reduce((s,p)=>s+(p.cost*p.qty),0)+Number(newRepair.laborCost)).toLocaleString()}
              </div>
            )}
            <button type="submit" className="btn-orange"><Check size={17}/>Finalizar Servicio</button>
          </form>
        )}

        {/* PRESUPUESTOS */}
        {view==='budgets' && (
          <div className="space-y-4">
            <div className="section-header">
              <h2 className="page-title">Presupuestos</h2>
              <button onClick={()=>setView('add_budget')} className="btn-orange" style={{width:'auto',padding:'10px 16px',fontSize:'13px'}}><Plus size={15}/>Nuevo</button>
            </div>
            {budgets.sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0)).map(budget=>(
              <div key={budget.id} className="card p-5">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold">{budget.clientName}</h4>
                    <p className="text-sm text-slate-500">{budget.vehicle}{budget.plate&&` · ${budget.plate}`}</p>
                    <p className="text-xs text-slate-400 mt-0.5">📅 {budget.date ? new Date(budget.date+'T12:00:00').toLocaleDateString('es-AR') : '—'}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <p className="text-xl font-black text-blue-600 font-display">${budget.totalCost?.toLocaleString()}</p>
                    <div className="flex gap-2">
                      <button onClick={()=>printBudget(budget)} className="btn-dark text-xs py-1.5 px-3"><Printer size={13}/>Imprimir</button>
                      <button onClick={()=>deleteItem('budgets',budget.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 size={14}/></button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {budgets.length===0 && <div className="card p-16 text-center text-slate-400"><FileText size={40} className="mx-auto mb-3 opacity-20"/><p>No hay presupuestos</p></div>}
          </div>
        )}

        {/* NUEVO PRESUPUESTO */}
        {view==='add_budget' && (
          <form onSubmit={saveBudget} className="card p-6 space-y-4 max-w-xl mx-auto">
            <div className="flex items-center gap-3">
              <button type="button" onClick={()=>setView('budgets')} className="p-2 rounded-xl bg-slate-100"><ChevronLeft size={18}/></button>
              <h2 className="font-display font-black text-xl">Nuevo Presupuesto</h2>
            </div>

            {/* Fecha editable */}
            <div><span className="lbl">Fecha del presupuesto</span><input className="inp" type="date" value={newBudget.date} onChange={e=>setNewBudget({...newBudget,date:e.target.value})}/></div>

            {/* Cliente vinculado */}
            <div className="relative">
              <span className="lbl">Cliente *</span>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15}/>
                <input className="inp pl-9" required placeholder="Buscar o escribir cliente..." value={clientSearch}
                  onChange={e=>{setClientSearch(e.target.value);setNewBudget({...newBudget,clientName:e.target.value});setShowClientDropdown(true);}}
                  onFocus={()=>setShowClientDropdown(true)}/>
              </div>
              {showClientDropdown && clientSearch && (
                <div className="absolute z-20 w-full bg-white border border-slate-200 rounded-xl shadow-xl mt-1 max-h-40 overflow-y-auto">
                  {clients.filter(c=>c.name.toLowerCase().includes(clientSearch.toLowerCase())).map(c=>(
                    <div key={c.id} onClick={()=>selectClient(c,'budget')} className="p-3 hover:bg-orange-50 cursor-pointer border-b border-slate-50 last:border-0">
                      <p className="font-bold text-sm">{c.name}</p>
                      <p className="text-xs text-slate-400">{c.phone}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div><span className="lbl">Teléfono cliente</span><input className="inp" placeholder="11-1234-5678" value={newBudget.clientPhone} onChange={e=>setNewBudget({...newBudget,clientPhone:e.target.value})}/></div>

            {/* Vehículos del cliente */}
            {newBudget.clientId && selectedClientVehicles(newBudget.clientId).length>0 && (
              <div>
                <span className="lbl">Vehículos del cliente</span>
                <div className="flex gap-2 flex-wrap">
                  {selectedClientVehicles(newBudget.clientId).map((v,i)=>(
                    <button key={i} type="button" onClick={()=>selectVehicle(v,'budget')}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border-2 transition-all ${newBudget.plate===v.plate?'border-orange-500 bg-orange-50 text-orange-700':'border-slate-200 bg-slate-50 text-slate-600'}`}>
                      {v.make} {v.model} · {v.plate}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div><span className="lbl">Vehículo *</span><input className="inp" required placeholder="Ford Ka 2018" value={newBudget.vehicle} onChange={e=>setNewBudget({...newBudget,vehicle:e.target.value})}/></div>
              <div><span className="lbl">Patente</span><input className="inp uppercase font-mono" placeholder="ABC123" value={newBudget.plate} onChange={e=>setNewBudget({...newBudget,plate:e.target.value.toUpperCase()})}/></div>
              <div><span className="lbl">Kilometraje</span><input className="inp" type="number" placeholder="75000" value={newBudget.km} onChange={e=>setNewBudget({...newBudget,km:e.target.value})}/></div>
              <div><span className="lbl">Mano de obra $</span><input className="inp" type="number" min="0" value={newBudget.laborCost} onChange={e=>setNewBudget({...newBudget,laborCost:e.target.value})}/></div>
            </div>
            <div><span className="lbl">Descripción del trabajo</span><textarea className="inp h-20 resize-none" placeholder="Qué se va a realizar..." value={newBudget.description} onChange={e=>setNewBudget({...newBudget,description:e.target.value})}/></div>
            <PartSelector inventory={inventory} parts={newBudget.partsUsed} onChange={parts=>setNewBudget({...newBudget,partsUsed:parts})}/>
            <div><span className="lbl">Notas adicionales</span><textarea className="inp h-16 resize-none" placeholder="Validez, condiciones, garantía..." value={newBudget.notes} onChange={e=>setNewBudget({...newBudget,notes:e.target.value})}/></div>
            {(newBudget.partsUsed.length>0||Number(newBudget.laborCost)>0) && (
              <div className="rounded-2xl p-4 text-sm font-bold text-blue-700" style={{background:'#eff6ff',border:'1px solid #bfdbfe'}}>
                💰 Total: ${(newBudget.partsUsed.reduce((s,p)=>s+(p.cost*p.qty),0)+Number(newBudget.laborCost)).toLocaleString()}
              </div>
            )}
            <button type="submit" className="btn-orange"><Save size={17}/>Guardar Presupuesto</button>
          </form>
        )}

        {/* CLIENTES */}
        {view==='clients' && (
          <div className="space-y-4">
            <div className="section-header">
              <h2 className="page-title">Clientes</h2>
              <button onClick={()=>setView('add_client')} className="btn-orange" style={{width:'auto',padding:'10px 16px',fontSize:'13px'}}><Plus size={15}/>Nuevo</button>
            </div>
            {clients.map(client=>(
              <div key={client.id} className="card p-5">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-bold text-base">{client.name}</h4>
                    {client.phone && <p className="text-sm text-slate-500">📞 {client.phone}</p>}
                    {client.email && <p className="text-xs text-slate-400">{client.email}</p>}
                  </div>
                  <button onClick={()=>deleteItem('clients',client.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-xl"><Trash2 size={15}/></button>
                </div>
                {client.vehicles?.length>0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {client.vehicles.map((v,i)=>(
                      <div key={i} className="bg-slate-50 rounded-xl px-3 py-2 text-xs">
                        <p className="font-bold text-slate-700">🚗 {v.make} {v.model} {v.year}</p>
                        {v.plate && <p className="font-mono text-slate-400">{v.plate}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {clients.length===0 && <div className="card p-16 text-center text-slate-400"><Users size={40} className="mx-auto mb-3 opacity-20"/><p>No hay clientes</p></div>}
          </div>
        )}

        {/* NUEVO CLIENTE */}
        {view==='add_client' && (
          <form onSubmit={addClient} className="card p-6 space-y-4 max-w-lg mx-auto">
            <div className="flex items-center gap-3">
              <button type="button" onClick={()=>setView('clients')} className="p-2 rounded-xl bg-slate-100"><ChevronLeft size={18}/></button>
              <h2 className="font-display font-black text-xl">Nuevo Cliente</h2>
            </div>
            <div><span className="lbl">Nombre *</span><input className="inp" required placeholder="Juan García" value={newClient.name} onChange={e=>setNewClient({...newClient,name:e.target.value})}/></div>
            <div className="grid grid-cols-2 gap-3">
              <div><span className="lbl">Teléfono</span><input className="inp" placeholder="11-1234-5678" value={newClient.phone} onChange={e=>setNewClient({...newClient,phone:e.target.value})}/></div>
              <div><span className="lbl">Email</span><input className="inp" type="email" placeholder="juan@email.com" value={newClient.email} onChange={e=>setNewClient({...newClient,email:e.target.value})}/></div>
            </div>

            {/* Agregar vehículos */}
            <div className="rounded-2xl p-4 space-y-3" style={{background:'#f8fafc',border:'1.5px dashed #e2e8f0'}}>
              <p className="font-bold text-sm text-slate-600">Vehículos del cliente</p>
              <div className="grid grid-cols-3 gap-2">
                <div><span className="lbl">Marca</span><input className="inp text-sm" placeholder="Toyota" value={newVehicle.make} onChange={e=>setNewVehicle({...newVehicle,make:e.target.value})}/></div>
                <div><span className="lbl">Modelo</span><input className="inp text-sm" placeholder="Corolla" value={newVehicle.model} onChange={e=>setNewVehicle({...newVehicle,model:e.target.value})}/></div>
                <div><span className="lbl">Año</span><input className="inp text-sm" placeholder="2018" value={newVehicle.year} onChange={e=>setNewVehicle({...newVehicle,year:e.target.value})}/></div>
                <div><span className="lbl">Patente</span><input className="inp text-sm uppercase font-mono" placeholder="ABC123" value={newVehicle.plate} onChange={e=>setNewVehicle({...newVehicle,plate:e.target.value.toUpperCase()})}/></div>
                <div><span className="lbl">KM actuales</span><input className="inp text-sm" type="number" placeholder="75000" value={newVehicle.km} onChange={e=>setNewVehicle({...newVehicle,km:e.target.value})}/></div>
                <div className="flex items-end"><button type="button" onClick={addVehicleToForm} className="btn-dark w-full"><Plus size={14}/>Agregar</button></div>
              </div>
              {newClient.vehicles.map((v,i)=>(
                <div key={i} className="flex items-center justify-between bg-white rounded-xl px-3 py-2">
                  <p className="text-sm font-bold">🚗 {v.make} {v.model} {v.year} · <span className="font-mono">{v.plate}</span></p>
                  <button type="button" onClick={()=>setNewClient(c=>({...c,vehicles:c.vehicles.filter((_,j)=>j!==i)}))} className="text-red-400"><X size={14}/></button>
                </div>
              ))}
            </div>
            <button type="submit" className="btn-orange"><Save size={17}/>Guardar Cliente</button>
          </form>
        )}

        {/* HISTORIAL */}
        {view==='history' && (
          <div className="space-y-4">
            <h2 className="page-title">Historial por Vehículo</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15}/>
              <input className="inp pl-9" placeholder="Buscar por patente o vehículo..." value={vehicleFilter} onChange={e=>setVehicleFilter(e.target.value)}/>
            </div>
            {vehicleFilter && vehicleHistory.length===0 && <div className="card p-8 text-center text-slate-400 text-sm">No se encontraron registros para "{vehicleFilter}"</div>}
            {vehicleHistory.sort((a,b)=>(b.date?.seconds||0)-(a.date?.seconds||0)).map(rep=>(
              <div key={rep.id} className="card p-5">
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <h4 className="font-bold">{rep.vehicle} <span className="font-mono text-sm text-slate-400">{rep.plate}</span></h4>
                    <div className="flex gap-3 text-xs text-slate-400 mt-0.5">
                      {rep.km && <span>🔢 {Number(rep.km).toLocaleString()} km</span>}
                      {rep.date?.seconds && <span>📅 {new Date(rep.date.seconds*1000).toLocaleDateString('es-AR')}</span>}
                    </div>
                  </div>
                  <p className="font-black text-emerald-600">${rep.totalCost?.toLocaleString()}</p>
                </div>
                <p className="text-sm text-slate-600">{rep.description}</p>
                {rep.notes && <p className="text-xs text-slate-400 mt-1">📝 {rep.notes}</p>}
              </div>
            ))}
            {!vehicleFilter && <div className="card p-16 text-center text-slate-400"><Clock size={40} className="mx-auto mb-3 opacity-20"/><p className="text-sm">Escribí una patente para ver el historial completo del vehículo</p></div>}
          </div>
        )}

        {/* AGREGAR REPUESTO */}
        {view==='add' && (
          <form onSubmit={addProduct} className="card p-6 space-y-4 max-w-md mx-auto">
            <div className="flex items-center gap-3">
              <button type="button" onClick={()=>setView('list')} className="p-2 rounded-xl bg-slate-100"><ChevronLeft size={18}/></button>
              <h2 className="font-display font-black text-xl">Nuevo Repuesto</h2>
            </div>
            <div><span className="lbl">Nombre *</span><input className="inp" required placeholder="Filtro de aceite" value={newProduct.name} onChange={e=>setNewProduct({...newProduct,name:e.target.value})}/></div>
            <div><span className="lbl">Ubicación</span><input className="inp" placeholder="Estante A, Cajón 2" value={newProduct.location} onChange={e=>setNewProduct({...newProduct,location:e.target.value})}/></div>
            
            {/* Foto repuesto */}
            <div>
              <span className="lbl">Foto del repuesto</span>
              <div className="flex gap-2">
                <button type="button" onClick={()=>startCamera('product')} className="btn-ghost flex-1"><Camera size={15}/>Tomar foto</button>
                <div className="relative">
                  <input type="text" className="inp text-xs" style={{width:'160px'}} placeholder="O pegar URL..." value={newProduct.imageUrl} onChange={e=>setNewProduct({...newProduct,imageUrl:e.target.value})}/>
                </div>
              </div>
              {newProduct.imageUrl && <img src={newProduct.imageUrl} alt="preview" className="w-full h-24 object-cover rounded-xl mt-2"/>}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div><span className="lbl">Costo $</span><input className="inp" type="number" min="0" value={newProduct.cost} onChange={e=>setNewProduct({...newProduct,cost:e.target.value})}/></div>
              <div><span className="lbl">Stock</span><input className="inp" type="number" min="0" value={newProduct.quantity} onChange={e=>setNewProduct({...newProduct,quantity:e.target.value})}/></div>
              <div><span className="lbl">Mínimo</span><input className="inp" type="number" min="0" value={newProduct.minStock} onChange={e=>setNewProduct({...newProduct,minStock:e.target.value})}/></div>
            </div>
            <button type="submit" className="btn-orange"><Save size={17}/>Guardar Repuesto</button>
          </form>
        )}

        {/* CÁMARA */}
        {view==='camera' && (
          <div className="fixed inset-0 bg-black z-[100] flex flex-col">
            <div className="flex items-center justify-between p-4">
              <button onClick={()=>{setView(cameraTarget==='product'?'add':'add_repair');setCapturedPhoto(null);}} className="p-3 bg-white/10 rounded-full text-white"><X size={24}/></button>
              <p className="text-white font-bold">Tomar foto</p>
              <div style={{width:48}}/>
            </div>
            <div className="flex-1 relative overflow-hidden">
              {!capturedPhoto
                ? <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover"/>
                : <img src={capturedPhoto} className="w-full h-full object-cover" alt="preview"/>
              }
            </div>
            <div className="p-6 flex items-center justify-center gap-6">
              {!capturedPhoto ? (
                <button onClick={capturePhoto} className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-2xl">
                  <div className="w-16 h-16 bg-orange-500 rounded-full"/>
                </button>
              ) : (
                <>
                  <button onClick={()=>setCapturedPhoto(null)} className="btn-ghost"><X size={16}/>Repetir</button>
                  <button onClick={confirmPhoto} className="btn-orange" style={{width:'auto'}}><Check size={16}/>Usar foto</button>
                </>
              )}
            </div>
          </div>
        )}

        {/* ESTADÍSTICAS */}
        {view==='stats' && (
          <div className="space-y-5">
            <div className="section-header">
              <h2 className="page-title">Estadísticas</h2>
              <select className="inp text-sm" style={{width:'auto',padding:'8px 12px'}} value={statsMonth} onChange={e=>setStatsMonth(Number(e.target.value))}>
                {MONTHS.map((m,i)=><option key={i} value={i}>{m}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                {label:'Ingresos del mes',value:`$${monthRevenue.toLocaleString()}`,Icon:DollarSign,gradient:'from-emerald-500 to-emerald-600'},
                {label:'Servicios del mes',value:monthRepairs.length,Icon:Car,gradient:'from-blue-500 to-blue-600'},
                {label:'Presupuestos',value:monthBudgets.length,Icon:FileText,gradient:'from-violet-500 to-violet-600'},
                {label:'Total repuestos',value:inventory.length,Icon:Package,gradient:'from-orange-500 to-orange-600'},
                {label:'Valor inventario',value:`$${inventory.reduce((s,p)=>s+(p.cost*p.quantity),0).toLocaleString()}`,Icon:TrendingUp,gradient:'from-rose-500 to-rose-600'},
                {label:'Clientes',value:clients.length,Icon:Users,gradient:'from-cyan-500 to-cyan-600'},
              ].map(({label,value,Icon,gradient})=>(
                <div key={label} className={`stat-card bg-gradient-to-br ${gradient} text-white`}>
                  <Icon size={18} className="opacity-80 mb-2"/>
                  <p className="text-2xl font-black font-display">{value}</p>
                  <p className="text-xs font-semibold opacity-80 uppercase tracking-wide mt-0.5">{label}</p>
                </div>
              ))}
            </div>
            {monthRepairs.length>0 && (
              <div className="card p-5">
                <p className="font-display font-bold mb-3">Servicios de {MONTHS[statsMonth]}</p>
                <div className="space-y-2">
                  {monthRepairs.map(r=>(
                    <div key={r.id} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
                      <div>
                        <p className="font-bold text-sm">{r.vehicle} <span className="font-mono text-xs text-slate-400">{r.plate}</span></p>
                        {r.date?.seconds && <p className="text-xs text-slate-400">{new Date(r.date.seconds*1000).toLocaleDateString('es-AR')}</p>}
                      </div>
                      <p className="font-black text-emerald-600">${r.totalCost?.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ASISTENTE IA */}
        {view==='ai_assistant' && (
          <div className="card p-6 space-y-4 max-w-xl mx-auto">
            <div className="flex items-center gap-3">
              <div style={{background:'linear-gradient(135deg,#fbbf24,#f59e0b)'}} className="p-2 rounded-xl">
                <Sparkles size={20} className="text-white"/>
              </div>
              <div>
                <h2 className="font-display font-black text-xl">Asistente IA</h2>
                <p className="text-slate-500 text-xs">Diagnósticos y consultas técnicas</p>
              </div>
            </div>
            <textarea className="inp h-36 resize-none" placeholder="Ej: Ford Focus 2012, ruido metálico al frenar, vibración en el volante a alta velocidad..." value={diagnosisQuery} onChange={e=>setDiagnosisQuery(e.target.value)}/>
            <button onClick={()=>askClaude(`Soy mecánico. Problema: ${diagnosisQuery}. Dame diagnóstico probable, pasos a seguir y repuestos que podría necesitar.`)} disabled={aiLoading||!diagnosisQuery.trim()} className="btn-orange disabled:opacity-50">
              {aiLoading?<><Loader2 className="animate-spin" size={17}/>Analizando...</>:<><Sparkles size={17}/>Consultar IA</>}
            </button>
            {aiResponse && (
              <div className="rounded-2xl p-5 text-sm leading-relaxed whitespace-pre-wrap text-slate-700" style={{background:'#fffbeb',border:'1px solid #fde68a'}}>
                <p className="font-bold text-amber-700 mb-2 flex items-center gap-1"><Sparkles size={13}/>Respuesta de la IA</p>
                {aiResponse}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Menú móvil */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-2 py-2 flex justify-around items-center z-50" style={{boxShadow:'0 -4px 20px rgba(0,0,0,0.08)'}}>
        {[
          {id:'dashboard',Icon:LayoutDashboard,label:'Panel'},
          {id:'list',Icon:Box,label:'Stock'},
          {id:'repairs',Icon:Car,label:'Servicios'},
          {id:'budgets',Icon:FileText,label:'Presupuestos'},
          {id:'clients',Icon:Users,label:'Clientes'},
        ].map(({id,Icon,label},idx)=>idx===2?(
          <button key={id} onClick={()=>setView(id)} className="flex flex-col items-center" style={{marginTop:'-20px'}}>
            <div className={`p-4 rounded-full shadow-lg border-4 border-white ${view===id?'':'bg-slate-800'}`} style={view===id?{background:'linear-gradient(135deg,#f97316,#ea580c)'}:{}}>
              <Icon size={22} className="text-white"/>
            </div>
            <span className={`text-[9px] font-bold mt-1 ${view===id?'text-orange-500':'text-slate-400'}`}>{label}</span>
          </button>
        ):(
          <button key={id} onClick={()=>setView(id)} className={`flex flex-col items-center gap-0.5 px-2 ${view===id?'text-orange-500':'text-slate-400'}`}>
            <Icon size={20}/>
            <span className="text-[9px] font-bold">{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pendiente;
  return (
    <span className={`status-badge ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`}/>
      {cfg.label}
    </span>
  );
}

function PartSelector({ inventory, parts, onChange }) {
  const [search, setSearch] = useState('');
  return (
    <div className="space-y-2">
      <span className="lbl">Repuestos utilizados</span>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13}/>
        <input className="inp pl-9 text-sm" placeholder="Buscar y agregar repuesto..." value={search} onChange={e=>setSearch(e.target.value)}/>
      </div>
      {search && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xl max-h-36 overflow-y-auto">
          {inventory.filter(i=>i.name.toLowerCase().includes(search.toLowerCase())&&i.quantity>0&&!parts.find(p=>p.id===i.id)).map(i=>(
            <div key={i.id} onClick={()=>{onChange([...parts,{id:i.id,name:i.name,qty:1,cost:i.cost}]);setSearch('');}}
              className="p-3 hover:bg-orange-50 cursor-pointer text-sm flex justify-between border-b border-slate-50 last:border-0">
              <span className="font-bold">{i.name}</span><span className="text-slate-400 text-xs">Stock: {i.quantity} · ${Number(i.cost).toLocaleString()}</span>
            </div>
          ))}
          {inventory.filter(i=>i.name.toLowerCase().includes(search.toLowerCase())).length===0&&<p className="p-3 text-slate-400 text-sm text-center">No encontrado</p>}
        </div>
      )}
      {parts.length>0 && (
        <div className="space-y-1.5">
          {parts.map((p,idx)=>(
            <div key={idx} className="flex items-center gap-2 rounded-xl px-3 py-2" style={{background:'#f8fafc'}}>
              <span className="text-sm font-bold flex-1">{p.name}</span>
              <input type="number" min="1" value={p.qty} onChange={e=>{const np=[...parts];np[idx].qty=Number(e.target.value);onChange(np);}} className="inp text-center text-sm py-1 px-2" style={{width:'3.5rem'}}/>
              <span className="text-xs text-slate-500 w-20 text-right font-bold">${(p.cost*p.qty).toLocaleString()}</span>
              <button type="button" onClick={()=>onChange(parts.filter((_,i)=>i!==idx))} className="text-red-400 hover:text-red-600"><X size={14}/></button>
            </div>
          ))}
          <div className="text-right text-xs font-bold text-slate-500 pr-2">
            Subtotal repuestos: ${parts.reduce((s,p)=>s+(p.cost*p.qty),0).toLocaleString()}
          </div>
        </div>
      )}
    </div>
  );
}
