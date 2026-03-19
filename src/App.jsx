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
  Clock, TrendingUp, Image, ChevronDown, CheckCircle,
  AlertTriangle, Package, Zap, BarChart3, RefreshCw, QrCode, ArrowRight
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
  pendiente: { label: 'Pendiente', color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-400', icon: '⏳' },
  en_proceso: { label: 'En proceso', color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500', icon: '🔧' },
  listo: { label: 'Listo', color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500', icon: '✅' },
  entregado: { label: 'Entregado', color: 'bg-slate-100 text-slate-500', dot: 'bg-slate-400', icon: '📦' },
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
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  const [diagnosisQuery, setDiagnosisQuery] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState('');
  const [statsMonth, setStatsMonth] = useState(new Date().getMonth());

  // Camera
  const videoRef = useRef(null);
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraTarget, setCameraTarget] = useState(null);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);

  // QR Scan modal
  const [scannedProduct, setScannedProduct] = useState(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrAction, setQrAction] = useState(null); // 'service' | 'deduct'
  const [selectedRepairForQR, setSelectedRepairForQR] = useState('');
  const [qrQty, setQrQty] = useState(1);

  // Convert repair to budget modal
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [repairToConvert, setRepairToConvert] = useState(null);

  // Forms
  const [newProduct, setNewProduct] = useState({ name: '', sku: '', location: '', quantity: 0, minStock: 1, cost: 0, imageUrl: '', description: '' });
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

  // Camera logic
  const startCamera = async (target) => {
    setCameraTarget(target);
    setCapturedPhoto(null);
    setCameraReady(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } });
      setCameraStream(stream);
      setView('camera');
    } catch { showNotification("No se pudo acceder a la cámara", "error"); }
  };

  useEffect(() => {
    if (view === 'camera' && cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.onloadedmetadata = () => setCameraReady(true);
    }
    if (view !== 'camera' && cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop());
      setCameraStream(null);
      setCameraReady(false);
    }
  }, [view, cameraStream]);

  const capturePhoto = () => {
    if (!videoRef.current || !cameraReady) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
    setCapturedPhoto(canvas.toDataURL('image/jpeg', 0.85));
  };

  const confirmPhoto = () => {
    if (cameraTarget === 'product') setNewProduct(p => ({ ...p, imageUrl: capturedPhoto }));
    if (cameraTarget === 'repair') setNewRepair(r => ({ ...r, imageUrl: capturedPhoto }));
    setView(cameraTarget === 'product' ? 'add' : 'add_repair');
    setCapturedPhoto(null);
  };

  const retakePhoto = () => setCapturedPhoto(null);

  // QR Scanner
  const startQRScan = () => {
    if (!document.getElementById('qr-scanner-script')) {
      const script = document.createElement('script');
      script.id = 'qr-scanner-script';
      script.src = "https://unpkg.com/html5-qrcode";
      script.async = true;
      document.body.appendChild(script);
    }
    setView('scan');
  };

  useEffect(() => {
    let html5QrCode = null;
    if (view === 'scan') {
      const tryStart = async () => {
        const Html5Qrcode = window.Html5Qrcode;
        if (!Html5Qrcode) { setTimeout(tryStart, 500); return; }
        try {
          html5QrCode = new Html5Qrcode("qr-reader");
          await html5QrCode.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 250, height: 250 } },
            (text) => {
              const found = inventory.find(p => p.sku === text || p.id === text);
              if (found) {
                setScannedProduct(found);
                setQrQty(1);
                setSelectedRepairForQR('');
                setQrAction(null);
                setShowQRModal(true);
                setView('dashboard');
              } else {
                showNotification("Código no encontrado", "error");
                setView('dashboard');
              }
              html5QrCode.stop().catch(() => {});
            }, () => {});
        } catch { setView('dashboard'); }
      };
      setTimeout(tryStart, 800);
    }
    return () => { if (html5QrCode?.isScanning) html5QrCode.stop().catch(() => {}); };
  }, [view, inventory, showNotification]);

  // QR Modal actions
  const handleQRDeduct = async () => {
    if (!scannedProduct) return;
    const newQty = Math.max(0, scannedProduct.quantity - qrQty);
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'inventory', scannedProduct.id), { quantity: newQty });
    showNotification(`✓ Stock actualizado: ${newQty} unidades`);
    setShowQRModal(false);
  };

  const handleQRAddToService = async () => {
    if (!scannedProduct || !selectedRepairForQR) return;
    const repair = repairs.find(r => r.id === selectedRepairForQR);
    if (!repair) return;
    const existingParts = repair.partsUsed || [];
    const existingIdx = existingParts.findIndex(p => p.id === scannedProduct.id);
    let updatedParts;
    if (existingIdx >= 0) {
      updatedParts = existingParts.map((p, i) => i === existingIdx ? { ...p, qty: p.qty + qrQty } : p);
    } else {
      updatedParts = [...existingParts, { id: scannedProduct.id, name: scannedProduct.name, qty: qrQty, cost: scannedProduct.cost }];
    }
    const partsCost = updatedParts.reduce((s, p) => s + (p.cost * p.qty), 0);
    const newTotal = partsCost + Number(repair.laborCost || 0);
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'repairs', selectedRepairForQR), {
      partsUsed: updatedParts, partsCost, totalCost: newTotal
    });
    // Deduct from stock
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'inventory', scannedProduct.id), {
      quantity: Math.max(0, scannedProduct.quantity - qrQty)
    });
    showNotification(`✓ ${scannedProduct.name} agregado al servicio`);
    setShowQRModal(false);
  };

  // Convert repair to budget
  const convertRepairToBudget = async (repair) => {
    const budget = {
      clientName: repair.clientName || '',
      clientPhone: '',
      vehicle: repair.vehicle || '',
      plate: repair.plate || '',
      km: repair.km || '',
      description: repair.description || '',
      partsUsed: repair.partsUsed || [],
      laborCost: repair.laborCost || 0,
      totalCost: repair.totalCost || 0,
      partsCost: repair.partsCost || 0,
      notes: repair.notes || '',
      date: new Date().toISOString().split('T')[0],
      createdAt: serverTimestamp(),
    };
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'budgets'), budget);
    setShowConvertModal(false);
    setRepairToConvert(null);
    showNotification("✓ Presupuesto creado desde el servicio");
    setView('budgets');
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
    const vStr = `${vehicle.make || ''} ${vehicle.model || ''} ${vehicle.year || ''}`.trim();
    if (formType === 'repair') {
      setNewRepair(r => ({ ...r, vehicle: vStr, plate: vehicle.plate || '', km: vehicle.km || '' }));
    } else {
      setNewBudget(b => ({ ...b, vehicle: vStr, plate: vehicle.plate || '', km: vehicle.km || '' }));
    }
  };

  const selectedClientVehicles = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    const v = client?.vehicles;
    return Array.isArray(v) ? v : [];
  };

  // Gemini AI
  const askAI = async (prompt) => {
    setAiLoading(true); setAiResponse('');
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          systemInstruction: { parts: [{ text: "Sos un experto jefe de taller mecánico argentino. Respondé en español rioplatense, claro y práctico." }] }
        })
      });
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error();
      setAiResponse(text);
    } catch {
      setAiResponse("⚠️ La IA no responde. Verificá que tu API key de Gemini esté activa en aistudio.google.com");
    }
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
      setNewProduct({ name: '', sku: '', location: '', quantity: 0, minStock: 1, cost: 0, imageUrl: '', description: '' });
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
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'clients'), { ...newClient, createdAt: serverTimestamp() });
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
    showNotification(`✓ Estado: ${STATUS_CONFIG[status].label}`);
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
    win.document.write(`<!DOCTYPE html><html><head><title>Presupuesto</title>
    <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Arial,sans-serif;padding:40px;color:#1e293b;max-width:820px;margin:0 auto}
    .header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:24px;margin-bottom:28px;border-bottom:3px solid #0f172a}
    h1{font-size:30px;font-weight:900;color:#0f172a;letter-spacing:-1px}.sub{font-size:12px;color:#64748b;margin-top:6px;line-height:1.6}
    .badge{background:#f97316;color:white;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px}
    .doc-title{font-size:22px;font-weight:900;color:#0f172a;text-transform:uppercase;letter-spacing:2px;text-align:right}
    .date{font-size:12px;color:#94a3b8;text-align:right;margin-top:4px}
    .section{margin:20px 0}.sec-title{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;color:#94a3b8;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid #f1f5f9}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.item label{font-size:10px;color:#94a3b8;font-weight:700;text-transform:uppercase;display:block;margin-bottom:3px}.item span{font-size:14px;font-weight:700}
    table{width:100%;border-collapse:collapse;margin-top:8px}thead tr{background:#0f172a}th{padding:11px 14px;text-align:left;font-size:11px;font-weight:700;color:white;text-transform:uppercase;letter-spacing:0.5px}
    td{padding:11px 14px;font-size:13px;border-bottom:1px solid #f1f5f9}tr:nth-child(even) td{background:#f8fafc}.labor td{background:#f1f5f9;font-weight:700}
    .total{background:#0f172a;color:white;padding:18px 22px;border-radius:12px;display:flex;justify-content:space-between;align-items:center;margin-top:22px}
    .total-label{font-size:13px;font-weight:600;opacity:0.6;text-transform:uppercase;letter-spacing:1px}.total-value{font-size:26px;font-weight:900}
    .notes{background:#fffbeb;border:1px solid #fde68a;padding:14px;border-radius:10px;font-size:13px;color:#92400e;margin-top:16px;line-height:1.6}
    .footer{margin-top:36px;padding-top:18px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center}
    .footer p{font-size:11px;color:#94a3b8}.validity{background:#f0fdf4;color:#166534;padding:5px 14px;border-radius:20px;font-size:11px;font-weight:700}</style>
    </head><body>
    <div class="header">
      <div><h1>${TALLER_INFO.nombre}</h1><p class="sub">${TALLER_INFO.direccion}<br>${TALLER_INFO.telefono} · ${TALLER_INFO.email}</p></div>
      <div><div class="doc-title">Presupuesto</div><div class="date">Fecha: ${dateStr}</div></div>
    </div>
    <div class="section"><div class="sec-title">Datos del cliente</div>
      <div class="grid"><div class="item"><label>Cliente</label><span>${budget.clientName}</span></div><div class="item"><label>Teléfono</label><span>${budget.clientPhone || '—'}</span></div></div>
    </div>
    <div class="section"><div class="sec-title">Vehículo</div>
      <div class="grid">
        <div class="item"><label>Vehículo</label><span>${budget.vehicle}</span></div>
        <div class="item"><label>Patente</label><span>${budget.plate || '—'}</span></div>
        ${budget.km ? `<div class="item"><label>Kilometraje</label><span>${Number(budget.km).toLocaleString()} km</span></div>` : ''}
      </div>
    </div>
    ${budget.description ? `<div class="section"><div class="sec-title">Trabajo a realizar</div><p style="font-size:14px;line-height:1.7;color:#334155">${budget.description}</p></div>` : ''}
    <div class="section"><div class="sec-title">Detalle</div>
      <table><thead><tr><th>Descripción</th><th>Cant.</th><th>Precio unit.</th><th>Subtotal</th></tr></thead><tbody>
        ${(budget.partsUsed || []).map(p => `<tr><td>${p.name}</td><td>${p.qty}</td><td>$${Number(p.cost).toLocaleString()}</td><td>$${(p.cost * p.qty).toLocaleString()}</td></tr>`).join('')}
        <tr class="labor"><td colspan="3">Mano de obra</td><td>$${Number(budget.laborCost || 0).toLocaleString()}</td></tr>
      </tbody></table>
    </div>
    <div class="total"><span class="total-label">Total del presupuesto</span><span class="total-value">$${(budget.totalCost || 0).toLocaleString()}</span></div>
    ${budget.notes ? `<div class="notes">📝 ${budget.notes}</div>` : ''}
    <div class="footer"><p>${TALLER_INFO.nombre} · ${TALLER_INFO.telefono}</p><span class="validity">✓ Válido por 15 días</span></div>
    </body></html>`);
    win.document.close(); win.print();
  };

  const printQRLabel = (product) => {
    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html><html><head><title>Etiqueta QR</title>
    <style>
      body{margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#fff}
      .label{width:6cm;padding:8px;border:1.5px solid #000;display:flex;flex-direction:column;align-items:center;gap:4px;font-family:Arial,sans-serif}
      .name{font-size:8px;font-weight:900;text-align:center;text-transform:uppercase;letter-spacing:0.5px;max-width:100%}
      .sku{font-size:6px;color:#666;font-family:monospace}
      .loc{font-size:6px;color:#999}
    </style></head><body>
    <div class="label">
      <div class="name">${product.name}</div>
      <img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${product.sku}&bgcolor=ffffff&color=000000" style="width:3.5cm;height:3.5cm"/>
      <div class="sku">${product.sku}</div>
      ${product.location ? `<div class="loc">📍 ${product.location}</div>` : ''}
    </div>
    <script>window.onload=()=>setTimeout(()=>window.print(),500)</script>
    </body></html>`);
    win.document.close();
  };

  // Stats
  const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const monthRepairs = repairs.filter(r => r.date?.seconds && new Date(r.date.seconds * 1000).getMonth() === statsMonth);
  const monthRevenue = monthRepairs.reduce((s, r) => s + (r.totalCost || 0), 0);
  const monthBudgets = budgets.filter(b => b.createdAt?.seconds && new Date(b.createdAt.seconds * 1000).getMonth() === statsMonth);
  const vehicleHistory = repairs.filter(r => vehicleFilter && (r.plate?.toLowerCase().includes(vehicleFilter.toLowerCase()) || r.vehicle?.toLowerCase().includes(vehicleFilter.toLowerCase())));
  const globalResults = globalSearch.length > 1 ? {
    inventory: inventory.filter(i => i.name?.toLowerCase().includes(globalSearch.toLowerCase())),
    repairs: repairs.filter(r => r.vehicle?.toLowerCase().includes(globalSearch.toLowerCase()) || r.plate?.toLowerCase().includes(globalSearch.toLowerCase()) || r.clientName?.toLowerCase().includes(globalSearch.toLowerCase())),
    clients: clients.filter(c => c.name?.toLowerCase().includes(globalSearch.toLowerCase()) || c.phone?.includes(globalSearch)),
    budgets: budgets.filter(b => b.clientName?.toLowerCase().includes(globalSearch.toLowerCase()) || b.vehicle?.toLowerCase().includes(globalSearch.toLowerCase())),
  } : null;

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center" style={{background:'#0a0f1e'}}>
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center" style={{background:'linear-gradient(135deg,#f97316,#dc2626)'}}>
          <Wrench size={36} className="text-white"/>
        </div>
      </div>
      <p className="font-black text-2xl text-white tracking-tight">TallerMaster</p>
      <p className="text-slate-500 text-sm mt-2 flex items-center gap-2"><Loader2 className="animate-spin" size={14}/>Cargando sistema...</p>
    </div>
  );

  return (
    <div className="min-h-screen text-slate-900 font-sans pb-24 md:pb-0 md:pl-64" style={{background:'#f0f2f7'}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap');
        *{font-family:'DM Sans',sans-serif}
        .font-display,.page-title,h1{font-family:'Syne',sans-serif}
        .card{background:white;border-radius:20px;box-shadow:0 1px 4px rgba(0,0,0,0.06),0 0 0 1px rgba(0,0,0,0.04)}
        .card-hover{transition:all 0.2s cubic-bezier(0.4,0,0.2,1)}
        .card-hover:hover{transform:translateY(-3px);box-shadow:0 12px 32px rgba(0,0,0,0.12),0 0 0 1px rgba(0,0,0,0.04)}
        .inp{background:#f4f6fa;border:1.5px solid #e8ecf2;border-radius:12px;padding:11px 14px;width:100%;outline:none;transition:all 0.2s;font-size:14px;color:#1e293b}
        .inp:focus{border-color:#f97316;background:white;box-shadow:0 0 0 4px rgba(249,115,22,0.08)}
        .btn-primary{background:linear-gradient(135deg,#f97316,#ea580c);color:white;padding:13px 20px;border-radius:14px;font-weight:700;display:flex;align-items:center;gap:8px;justify-content:center;cursor:pointer;border:none;width:100%;font-size:15px;letter-spacing:-0.2px;box-shadow:0 4px 16px rgba(249,115,22,0.35),0 1px 0 rgba(255,255,255,0.2) inset;transition:all 0.2s}
        .btn-primary:hover{transform:translateY(-1px);box-shadow:0 8px 24px rgba(249,115,22,0.4)}
        .btn-primary:disabled{opacity:0.5;transform:none;cursor:not-allowed}
        .btn-dark{background:#0f172a;color:white;padding:9px 16px;border-radius:11px;font-weight:700;display:flex;align-items:center;gap:6px;justify-content:center;cursor:pointer;border:none;font-size:13px;transition:all 0.2s;box-shadow:0 2px 8px rgba(0,0,0,0.2)}
        .btn-dark:hover{background:#1e293b}
        .btn-ghost{background:#f1f5f9;color:#475569;padding:9px 14px;border-radius:11px;font-weight:600;display:flex;align-items:center;gap:6px;cursor:pointer;border:1.5px solid #e2e8f0;font-size:13px;transition:all 0.2s}
        .btn-ghost:hover{background:#e8ecf2;border-color:#cbd5e1}
        .lbl{font-size:11px;font-weight:700;color:#64748b;margin-bottom:5px;text-transform:uppercase;letter-spacing:0.8px;display:block}
        .status-pill{padding:5px 11px;border-radius:20px;font-size:11px;font-weight:700;display:inline-flex;align-items:center;gap:5px}
        .nav-item{width:100%;display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:12px;font-size:13px;font-weight:600;transition:all 0.2s;cursor:pointer;border:none;text-align:left;letter-spacing:-0.1px}
        .nav-item.active{background:linear-gradient(135deg,#f97316,#ea580c);color:white;box-shadow:0 4px 14px rgba(249,115,22,0.35)}
        .nav-item:not(.active){color:#64748b}.nav-item:not(.active):hover{background:rgba(255,255,255,0.06);color:white}
        .page-title{font-family:'Syne',sans-serif;font-size:26px;font-weight:900;letter-spacing:-0.8px;color:#0f172a}
        .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.6);backdrop-filter:blur(8px);z-index:200;display:flex;align-items:center;justify-content:center;padding:20px}
        .modal{background:white;border-radius:24px;padding:28px;width:100%;max-width:480px;box-shadow:0 24px 64px rgba(0,0,0,0.3)}
        .gradient-card{border-radius:20px;padding:22px;position:relative;overflow:hidden}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#e2e8f0;border-radius:4px}
        @keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        .animate-slide-up{animation:slideUp 0.3s ease-out}
        .shutter-btn{width:72px;height:72px;border-radius:50%;background:white;border:4px solid rgba(255,255,255,0.4);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all 0.15s;box-shadow:0 4px 20px rgba(0,0,0,0.4)}
        .shutter-btn:active{transform:scale(0.92)}
        .shutter-inner{width:56px;height:56px;border-radius:50%;background:white;border:2px solid #e2e8f0}
        .shutter-inner.captured{background:linear-gradient(135deg,#f97316,#ea580c)}
      `}</style>

      {/* QR MODAL */}
      {showQRModal && scannedProduct && (
        <div className="modal-overlay" onClick={()=>setShowQRModal(false)}>
          <div className="modal animate-slide-up" onClick={e=>e.stopPropagation()}>
            <div className="flex justify-between items-start mb-5">
              <div>
                <p className="text-xs font-bold text-orange-500 uppercase tracking-widest mb-1">Repuesto escaneado</p>
                <h3 className="font-display font-black text-xl">{scannedProduct.name}</h3>
                <p className="font-mono text-xs text-slate-400 mt-0.5">{scannedProduct.sku}</p>
              </div>
              <button onClick={()=>setShowQRModal(false)} className="p-2 hover:bg-slate-100 rounded-xl"><X size={18}/></button>
            </div>

            {scannedProduct.imageUrl && (
              <img src={scannedProduct.imageUrl} alt={scannedProduct.name} className="w-full h-40 object-cover rounded-2xl mb-4"/>
            )}

            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="bg-slate-50 rounded-2xl p-3 text-center">
                <p className={`text-2xl font-black font-display ${scannedProduct.quantity <= scannedProduct.minStock ? 'text-red-500' : 'text-slate-800'}`}>{scannedProduct.quantity}</p>
                <p className="text-xs text-slate-400 font-bold uppercase">Stock</p>
              </div>
              <div className="bg-slate-50 rounded-2xl p-3 text-center">
                <p className="text-xl font-black font-display">${Number(scannedProduct.cost).toLocaleString()}</p>
                <p className="text-xs text-slate-400 font-bold uppercase">Costo</p>
              </div>
              <div className="bg-slate-50 rounded-2xl p-3 text-center">
                <p className="text-sm font-bold text-slate-600">{scannedProduct.location || '—'}</p>
                <p className="text-xs text-slate-400 font-bold uppercase">Ubicación</p>
              </div>
            </div>

            {scannedProduct.description && <p className="text-sm text-slate-500 mb-4 italic">{scannedProduct.description}</p>}

            {/* Cantidad */}
            <div className="flex items-center justify-center gap-4 bg-slate-50 rounded-2xl p-3 mb-4">
              <button onClick={()=>setQrQty(q=>Math.max(1,q-1))} className="p-2 bg-white shadow rounded-xl"><MinusCircle className="text-red-400" size={20}/></button>
              <div className="text-center">
                <p className="text-2xl font-black font-display">{qrQty}</p>
                <p className="text-xs text-slate-400">unidades</p>
              </div>
              <button onClick={()=>setQrQty(q=>Math.min(scannedProduct.quantity,q+1))} className="p-2 bg-white shadow rounded-xl"><PlusCircle className="text-emerald-500" size={20}/></button>
            </div>

            {/* Acciones */}
            {!qrAction && (
              <div className="grid grid-cols-2 gap-3">
                <button onClick={()=>setQrAction('deduct')} className="card-hover card p-4 text-center flex flex-col items-center gap-2 cursor-pointer hover:border-red-200 border border-transparent">
                  <MinusCircle size={24} className="text-red-500"/>
                  <span className="font-bold text-sm">Restar del stock</span>
                </button>
                <button onClick={()=>setQrAction('service')} className="card-hover card p-4 text-center flex flex-col items-center gap-2 cursor-pointer hover:border-blue-200 border border-transparent">
                  <Car size={24} className="text-blue-500"/>
                  <span className="font-bold text-sm">Agregar a servicio</span>
                </button>
              </div>
            )}

            {qrAction === 'deduct' && (
              <div className="space-y-3">
                <p className="text-sm font-bold text-slate-600">Restar <span className="text-red-500">{qrQty}</span> unidad(es) del stock</p>
                <div className="flex gap-2">
                  <button onClick={()=>setQrAction(null)} className="btn-ghost flex-1">Cancelar</button>
                  <button onClick={handleQRDeduct} className="btn-primary flex-1" style={{background:'linear-gradient(135deg,#ef4444,#dc2626)'}}><Check size={16}/>Confirmar</button>
                </div>
              </div>
            )}

            {qrAction === 'service' && (
              <div className="space-y-3">
                <div>
                  <span className="lbl">Seleccionar servicio activo</span>
                  <select className="inp" value={selectedRepairForQR} onChange={e=>setSelectedRepairForQR(e.target.value)}>
                    <option value="">— Elegí un servicio —</option>
                    {repairs.filter(r=>r.status!=='entregado').map(r=>(
                      <option key={r.id} value={r.id}>{r.vehicle} {r.plate && `· ${r.plate}`} ({STATUS_CONFIG[r.status||'pendiente'].label})</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <button onClick={()=>setQrAction(null)} className="btn-ghost flex-1">Cancelar</button>
                  <button onClick={handleQRAddToService} disabled={!selectedRepairForQR} className="btn-primary flex-1"><Check size={16}/>Agregar</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CONVERT REPAIR TO BUDGET MODAL */}
      {showConvertModal && repairToConvert && (
        <div className="modal-overlay" onClick={()=>setShowConvertModal(false)}>
          <div className="modal animate-slide-up" onClick={e=>e.stopPropagation()}>
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{background:'linear-gradient(135deg,#dbeafe,#bfdbfe)'}}>
                <FileText size={28} className="text-blue-600"/>
              </div>
              <h3 className="font-display font-black text-xl">Convertir a Presupuesto</h3>
              <p className="text-slate-500 text-sm mt-2">Se va a crear un presupuesto con todos los datos del servicio de <strong>{repairToConvert.vehicle}</strong></p>
            </div>
            <div className="bg-slate-50 rounded-2xl p-4 mb-5 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Cliente</span><span className="font-bold">{repairToConvert.clientName || '—'}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Vehículo</span><span className="font-bold">{repairToConvert.vehicle}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Total</span><span className="font-black text-emerald-600">${repairToConvert.totalCost?.toLocaleString()}</span></div>
            </div>
            <div className="flex gap-3">
              <button onClick={()=>setShowConvertModal(false)} className="btn-ghost flex-1">Cancelar</button>
              <button onClick={()=>convertRepairToBudget(repairToConvert)} className="btn-primary flex-1"><ArrowRight size={16}/>Crear Presupuesto</button>
            </div>
          </div>
        </div>
      )}

      {/* SIDEBAR */}
      <nav className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-64 p-5 z-50" style={{background:'#0a0f1e',borderRight:'1px solid rgba(255,255,255,0.05)'}}>
        <div className="flex items-center gap-3 mb-7">
          <div className="p-2 rounded-xl flex-shrink-0" style={{background:'linear-gradient(135deg,#f97316,#ea580c)'}}>
            <Wrench size={20} className="text-white"/>
          </div>
          <div>
            <h1 className="text-white font-display font-black text-base leading-tight">TallerMaster</h1>
            <p className="text-slate-500 text-xs">{TALLER_INFO.nombre}</p>
          </div>
        </div>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={14}/>
          <input className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl text-white placeholder-slate-600 outline-none" style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.07)'}} placeholder="Buscar todo..." value={globalSearch} onChange={e=>setGlobalSearch(e.target.value)} onFocus={()=>setView('search')}/>
        </div>
        <div className="space-y-0.5 flex-1 overflow-y-auto">
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
        <button onClick={startQRScan} className="mt-4 flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer border" style={{color:'#f97316',borderColor:'rgba(249,115,22,0.3)',background:'rgba(249,115,22,0.05)'}}>
          <QrCode size={16}/>Escanear QR
        </button>
        <div className="mt-3 rounded-xl p-3 text-xs" style={{background:'rgba(255,255,255,0.04)'}}>
          <p className="font-bold text-slate-300">{TALLER_INFO.nombre}</p>
          <p className="text-slate-600 mt-0.5">{TALLER_INFO.telefono}</p>
        </div>
      </nav>

      <main className="p-4 md:p-6 max-w-4xl mx-auto">
        {/* Notification */}
        {notification && (
          <div className={`fixed bottom-28 md:bottom-6 right-4 ${notification.type==='error'?'bg-red-600':'bg-slate-900'} text-white px-5 py-3 rounded-2xl shadow-2xl z-[150] flex items-center gap-3`}>
            {notification.type==='error'?<AlertCircle size={17}/>:<Check className="text-orange-400" size={17}/>}
            <span className="font-bold text-sm">{notification.msg}</span>
          </div>
        )}

        {/* DASHBOARD */}
        {view==='dashboard' && (
          <div className="space-y-5 animate-slide-up">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-slate-500 text-sm">Sistema de gestión</p>
                <h2 className="page-title">{TALLER_INFO.nombre}</h2>
              </div>
              <button onClick={startQRScan} className="btn-dark md:hidden"><QrCode size={16}/>Escanear</button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                {label:'Repuestos',value:inventory.length,from:'#3b82f6',to:'#2563eb',Icon:Package},
                {label:'Servicios activos',value:repairs.filter(r=>r.status!=='entregado').length,from:'#8b5cf6',to:'#7c3aed',Icon:Car},
                {label:'Stock bajo',value:inventory.filter(p=>p.quantity<=p.minStock).length,from:'#ef4444',to:'#dc2626',Icon:AlertTriangle},
                {label:'Clientes',value:clients.length,from:'#10b981',to:'#059669',Icon:Users},
              ].map(({label,value,from,to,Icon})=>(
                <div key={label} className="gradient-card text-white" style={{background:`linear-gradient(135deg,${from},${to})`}}>
                  <Icon size={18} className="opacity-70 mb-3"/>
                  <p className="text-3xl font-display font-black">{value}</p>
                  <p className="text-xs font-semibold opacity-70 uppercase tracking-wide mt-1">{label}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                {label:'Nuevo Servicio',Icon:Wrench,action:'add_repair',desc:'Registrar trabajo'},
                {label:'Presupuesto',Icon:FileText,action:'add_budget',desc:'Crear cotización'},
                {label:'Nuevo Repuesto',Icon:Plus,action:'add',desc:'Sumar al stock'},
              ].map(({label,Icon,action,desc})=>(
                <button key={action} onClick={()=>setView(action)} className="card card-hover p-4 text-left w-full">
                  <div className="p-2.5 rounded-xl mb-3 inline-block" style={{background:'linear-gradient(135deg,#fff7ed,#ffedd5)'}}>
                    <Icon size={20} className="text-orange-500"/>
                  </div>
                  <p className="font-bold text-slate-800 text-sm">{label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
                </button>
              ))}
            </div>
            {repairs.filter(r=>r.status!=='entregado').length>0 && (
              <div className="card p-5">
                <div className="flex justify-between items-center mb-4">
                  <p className="font-display font-bold text-slate-800">Servicios activos</p>
                  <button onClick={()=>setView('repairs')} className="text-xs text-orange-500 font-bold hover:text-orange-600">Ver todos →</button>
                </div>
                <div className="space-y-2">
                  {repairs.filter(r=>r.status!=='entregado').slice(0,4).map(rep=>(
                    <div key={rep.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                      <div>
                        <p className="font-bold text-sm">{rep.vehicle} {rep.plate && <span className="font-mono text-xs text-slate-400 font-normal">{rep.plate}</span>}</p>
                        <p className="text-xs text-slate-400">{rep.clientName || 'Sin cliente'}</p>
                      </div>
                      <StatusPill status={rep.status||'pendiente'}/>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {inventory.filter(p=>p.quantity<=p.minStock).length>0 && (
              <div className="card p-5" style={{borderLeft:'4px solid #ef4444'}}>
                <p className="font-bold text-red-600 flex items-center gap-2 text-sm mb-3"><AlertTriangle size={15}/>Stock bajo — reponé estos artículos</p>
                {inventory.filter(p=>p.quantity<=p.minStock).map(p=>(
                  <div key={p.id} className="flex justify-between text-sm py-1.5 border-b border-slate-50 last:border-0">
                    <span className="font-medium text-slate-700">{p.name}</span>
                    <span className="font-black text-red-500">{p.quantity} un.</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* BÚSQUEDA GLOBAL */}
        {view==='search' && globalSearch.length>1 && (
          <div className="space-y-4 animate-slide-up">
            <h2 className="page-title">"{globalSearch}"</h2>
            {globalResults?.clients.length>0 && <div className="card p-5"><p className="lbl mb-3">Clientes</p>{globalResults.clients.map(c=><div key={c.id} className="py-2 border-b border-slate-50 last:border-0"><p className="font-bold text-sm">{c.name}</p><p className="text-xs text-slate-400">{c.phone}</p></div>)}</div>}
            {globalResults?.repairs.length>0 && <div className="card p-5"><p className="lbl mb-3">Servicios</p>{globalResults.repairs.map(r=><div key={r.id} className="py-2 border-b border-slate-50 last:border-0 flex justify-between items-center"><div><p className="font-bold text-sm">{r.vehicle} {r.plate}</p><p className="text-xs text-slate-400">{r.clientName}</p></div><StatusPill status={r.status||'pendiente'}/></div>)}</div>}
            {globalResults?.inventory.length>0 && <div className="card p-5"><p className="lbl mb-3">Repuestos</p>{globalResults.inventory.map(i=><div key={i.id} className="py-2 border-b border-slate-50 last:border-0 flex justify-between"><p className="font-bold text-sm">{i.name}</p><span className={`text-xs font-bold ${i.quantity<=i.minStock?'text-red-500':'text-emerald-600'}`}>{i.quantity} un.</span></div>)}</div>}
            {Object.values(globalResults||{}).every(a=>a.length===0) && <div className="card p-16 text-center text-slate-400"><Search size={36} className="mx-auto mb-3 opacity-20"/><p>Sin resultados para "{globalSearch}"</p></div>}
          </div>
        )}

        {/* INVENTARIO */}
        {view==='list' && (
          <div className="space-y-4 animate-slide-up">
            <div className="flex gap-3 justify-between items-center">
              <h2 className="page-title">Inventario</h2>
              <div className="flex gap-2">
                <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14}/><input className="inp pl-9 text-sm" style={{width:'180px'}} placeholder="Buscar..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}/></div>
                <button onClick={()=>setView('add')} className="btn-primary" style={{width:'auto',padding:'10px 14px',fontSize:'13px'}}><Plus size={15}/></button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {inventory.filter(p=>p.name.toLowerCase().includes(searchTerm.toLowerCase())).map(item=>(
                <div key={item.id} onClick={()=>{setSelectedProduct(item);setView('details');}} className="card card-hover p-4 cursor-pointer">
                  {item.imageUrl ? <img src={item.imageUrl} alt={item.name} className="w-full h-28 object-cover rounded-2xl mb-3"/> : <div className="w-full h-16 rounded-2xl mb-3 flex items-center justify-center" style={{background:'#f8fafc'}}><Package size={24} className="text-slate-300"/></div>}
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-sm flex-1 pr-2 text-slate-800">{item.name}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black flex-shrink-0 ${item.quantity<=item.minStock?'bg-red-100 text-red-600':'bg-emerald-100 text-emerald-700'}`}>{item.quantity} un.</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1"><MapPin size={10}/>{item.location||'Sin ubicación'}</p>
                  <p className="text-lg font-black text-slate-800 mt-1 font-display">${Number(item.cost).toLocaleString()}</p>
                </div>
              ))}
              {inventory.length===0 && <div className="col-span-3 card p-16 text-center text-slate-400"><Package size={40} className="mx-auto mb-3 opacity-20"/><p className="font-medium">Sin repuestos aún</p></div>}
            </div>
          </div>
        )}

        {/* DETALLE REPUESTO */}
        {view==='details' && selectedProduct && (
          <div className="card overflow-hidden max-w-sm mx-auto animate-slide-up">
            <div className="p-6 text-white relative" style={{background:'linear-gradient(145deg,#0f172a,#1e293b)'}}>
              <button onClick={()=>setView('list')} className="absolute top-4 left-4 p-1.5 rounded-xl" style={{background:'rgba(255,255,255,0.08)'}}><ChevronLeft size={18} className="text-white"/></button>
              <button onClick={()=>{deleteItem('inventory',selectedProduct.id);setView('list');}} className="absolute top-4 right-4 p-1.5 rounded-xl text-red-400" style={{background:'rgba(239,68,68,0.12)'}}><Trash2 size={16}/></button>
              {selectedProduct.imageUrl ? <img src={selectedProduct.imageUrl} alt={selectedProduct.name} className="w-full h-36 object-cover rounded-2xl mb-4 mt-6"/> : <div className="w-full h-16 rounded-2xl mb-4 mt-8 flex items-center justify-center" style={{background:'rgba(255,255,255,0.04)'}}><Package size={28} className="text-slate-700"/></div>}
              <h2 className="font-display font-black text-xl uppercase text-center">{selectedProduct.name}</h2>
              <p className="text-orange-400 font-mono text-xs text-center mt-1">{selectedProduct.sku}</p>
              {selectedProduct.description && <p className="text-slate-400 text-xs text-center mt-1">{selectedProduct.description}</p>}
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl p-4 text-center" style={{background:'#f8fafc'}}>
                  <p className={`text-4xl font-black font-display ${selectedProduct.quantity<=selectedProduct.minStock?'text-red-500':'text-slate-800'}`}>{selectedProduct.quantity}</p>
                  <p className="text-xs font-bold text-slate-400 uppercase mt-1">Stock</p>
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
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${selectedProduct.sku}&bgcolor=ffffff`} className="w-28 h-28 mx-auto rounded-2xl border p-1" alt="QR"/>
                <button onClick={()=>printQRLabel(selectedProduct)} className="btn-ghost mt-3 mx-auto" style={{width:'auto'}}><Printer size={15}/>Imprimir etiqueta</button>
              </div>
            </div>
          </div>
        )}

        {/* SERVICIOS */}
        {view==='repairs' && (
          <div className="space-y-4 animate-slide-up">
            <div className="flex justify-between items-center">
              <h2 className="page-title">Servicios</h2>
              <button onClick={()=>setView('add_repair')} className="btn-primary" style={{width:'auto',padding:'10px 16px',fontSize:'13px'}}><Plus size={15}/>Nuevo</button>
            </div>
            <div className="flex gap-2 flex-wrap">
              {Object.entries(STATUS_CONFIG).map(([key,cfg])=>(
                <span key={key} className={`status-pill ${cfg.color}`}><span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`}/>{cfg.icon} {cfg.label} ({repairs.filter(r=>(r.status||'pendiente')===key).length})</span>
              ))}
            </div>
            <div className="space-y-3">
              {repairs.sort((a,b)=>(b.date?.seconds||0)-(a.date?.seconds||0)).map(rep=>(
                <div key={rep.id} className="card p-5">
                  {rep.imageUrl && <img src={rep.imageUrl} alt="Vehículo" className="w-full h-36 object-cover rounded-2xl mb-4"/>}
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h4 className="font-bold text-slate-800">{rep.vehicle}</h4>
                        {rep.plate && <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded-lg text-slate-500">{rep.plate}</span>}
                        <StatusPill status={rep.status||'pendiente'}/>
                      </div>
                      <div className="flex gap-3 text-xs text-slate-400 flex-wrap">
                        {rep.clientName && <span className="flex items-center gap-1"><Users size={10}/>{rep.clientName}</span>}
                        {rep.km && <span>🔢 {Number(rep.km).toLocaleString()} km</span>}
                        {rep.date?.seconds && <span>📅 {new Date(rep.date.seconds*1000).toLocaleDateString('es-AR')}</span>}
                      </div>
                    </div>
                    <div className="text-right ml-3">
                      <p className="font-black text-emerald-600 text-xl font-display">${rep.totalCost?.toLocaleString()}</p>
                      {rep.laborCost>0 && <p className="text-xs text-slate-400">MO: ${Number(rep.laborCost).toLocaleString()}</p>}
                    </div>
                  </div>
                  {rep.description && <p className="text-sm text-slate-500 italic mb-3">{rep.description}</p>}
                  {rep.notes && <div className="text-xs text-slate-500 bg-amber-50 rounded-xl p-2.5 mb-3 border border-amber-100">📝 {rep.notes}</div>}
                  {rep.partsUsed?.length>0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {rep.partsUsed.map((p,i)=><span key={i} className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[10px] font-bold">{p.qty}x {p.name}</span>)}
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                    <div className="flex gap-1 flex-wrap">
                      {Object.keys(STATUS_CONFIG).map(s=>(
                        <button key={s} onClick={()=>updateRepairStatus(rep.id,s)} className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-all ${(rep.status||'pendiente')===s?'bg-slate-800 text-white shadow-sm':'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                          {STATUS_CONFIG[s].icon}
                        </button>
                      ))}
                    </div>
                    {(rep.status==='listo'||rep.status==='entregado') && (
                      <button onClick={()=>{setRepairToConvert(rep);setShowConvertModal(true);}} className="flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-xl hover:bg-blue-100 transition-colors">
                        <FileText size={13}/>Hacer presupuesto
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {repairs.length===0 && <div className="card p-16 text-center text-slate-400"><Car size={40} className="mx-auto mb-3 opacity-20"/><p>No hay servicios</p></div>}
            </div>
          </div>
        )}

        {/* NUEVO SERVICIO */}
        {view==='add_repair' && (
          <form onSubmit={finishRepair} className="card p-6 space-y-4 max-w-xl mx-auto animate-slide-up">
            <div className="flex items-center gap-3">
              <button type="button" onClick={()=>setView('repairs')} className="p-2 rounded-xl bg-slate-100"><ChevronLeft size={18}/></button>
              <h2 className="font-display font-black text-xl">Nuevo Servicio</h2>
            </div>
            <div className="relative">
              <span className="lbl">Cliente</span>
              <div className="relative"><Users className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15}/><input className="inp pl-9" placeholder="Buscar cliente..." value={clientSearch} onChange={e=>{setClientSearch(e.target.value);setShowClientDropdown(true);}} onFocus={()=>setShowClientDropdown(true)}/></div>
              {showClientDropdown && clientSearch && (
                <div className="absolute z-20 w-full bg-white border border-slate-200 rounded-2xl shadow-2xl mt-1 max-h-40 overflow-y-auto">
                  {clients.filter(c=>c.name.toLowerCase().includes(clientSearch.toLowerCase())).map(c=>(
                    <div key={c.id} onClick={()=>selectClient(c,'repair')} className="p-3 hover:bg-orange-50 cursor-pointer border-b border-slate-50 last:border-0">
                      <p className="font-bold text-sm">{c.name}</p><p className="text-xs text-slate-400">{c.phone}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {newRepair.clientId && selectedClientVehicles(newRepair.clientId).length>0 && (
              <div><span className="lbl">Vehículos del cliente — tocá para autocompletar</span>
                <div className="flex gap-2 flex-wrap">
                  {selectedClientVehicles(newRepair.clientId).map((v,i)=>(
                    <button key={i} type="button" onClick={()=>selectVehicle(v,'repair')} className={`px-3 py-2 rounded-xl text-xs font-bold border-2 transition-all ${newRepair.plate===v.plate?'border-orange-500 bg-orange-50 text-orange-700':'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'}`}>
                      🚗 {v.make} {v.model} · <span className="font-mono">{v.plate}</span>
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
            <div><span className="lbl">Estado inicial</span>
              <div className="flex gap-2 flex-wrap">
                {Object.entries(STATUS_CONFIG).map(([key,cfg])=>(
                  <button key={key} type="button" onClick={()=>setNewRepair({...newRepair,status:key})} className={`status-pill cursor-pointer border-2 transition-all ${newRepair.status===key?'border-orange-500 ring-2 ring-orange-200':'border-transparent'} ${cfg.color}`}>
                    {cfg.icon} {cfg.label}
                  </button>
                ))}
              </div>
            </div>
            <div><span className="lbl">Descripción</span><textarea className="inp h-20 resize-none" placeholder="Trabajo realizado..." value={newRepair.description} onChange={e=>setNewRepair({...newRepair,description:e.target.value})}/></div>
            <div><span className="lbl">Notas internas</span><input className="inp" placeholder="Observaciones, próximo service..." value={newRepair.notes} onChange={e=>setNewRepair({...newRepair,notes:e.target.value})}/></div>
            <div>
              <span className="lbl">Foto del vehículo</span>
              <div className="flex gap-2">
                <button type="button" onClick={()=>startCamera('repair')} className="btn-ghost flex-1"><Camera size={15}/>Tomar foto</button>
                {newRepair.imageUrl && <div className="relative"><img src={newRepair.imageUrl} className="h-10 w-16 object-cover rounded-xl" alt=""/><button type="button" onClick={()=>setNewRepair({...newRepair,imageUrl:''})} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5"><X size={10}/></button></div>}
              </div>
            </div>
            <PartSelector inventory={inventory} parts={newRepair.partsUsed} onChange={parts=>setNewRepair({...newRepair,partsUsed:parts})}/>
            {(newRepair.partsUsed.length>0||Number(newRepair.laborCost)>0) && (
              <div className="rounded-2xl p-4 text-sm font-bold" style={{background:'#f0fdf4',border:'1px solid #bbf7d0',color:'#166534'}}>
                💰 Total estimado: ${(newRepair.partsUsed.reduce((s,p)=>s+(p.cost*p.qty),0)+Number(newRepair.laborCost)).toLocaleString()}
              </div>
            )}
            <button type="submit" className="btn-primary"><Check size={17}/>Finalizar Servicio</button>
          </form>
        )}

        {/* PRESUPUESTOS */}
        {view==='budgets' && (
          <div className="space-y-4 animate-slide-up">
            <div className="flex justify-between items-center">
              <h2 className="page-title">Presupuestos</h2>
              <button onClick={()=>setView('add_budget')} className="btn-primary" style={{width:'auto',padding:'10px 16px',fontSize:'13px'}}><Plus size={15}/>Nuevo</button>
            </div>
            {budgets.sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0)).map(budget=>(
              <div key={budget.id} className="card p-5">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-slate-800">{budget.clientName}</h4>
                    <p className="text-sm text-slate-500">{budget.vehicle}{budget.plate&&` · ${budget.plate}`}</p>
                    <p className="text-xs text-slate-400 mt-0.5">📅 {budget.date?new Date(budget.date+'T12:00:00').toLocaleDateString('es-AR'):'—'}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <p className="text-xl font-black text-blue-600 font-display">${budget.totalCost?.toLocaleString()}</p>
                    <div className="flex gap-2">
                      <button onClick={()=>printBudget(budget)} className="btn-dark text-xs py-1.5 px-3"><Printer size={13}/>Imprimir</button>
                      <button onClick={()=>deleteItem('budgets',budget.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-xl"><Trash2 size={14}/></button>
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
          <form onSubmit={saveBudget} className="card p-6 space-y-4 max-w-xl mx-auto animate-slide-up">
            <div className="flex items-center gap-3">
              <button type="button" onClick={()=>setView('budgets')} className="p-2 rounded-xl bg-slate-100"><ChevronLeft size={18}/></button>
              <h2 className="font-display font-black text-xl">Nuevo Presupuesto</h2>
            </div>
            <div><span className="lbl">Fecha</span><input className="inp" type="date" value={newBudget.date} onChange={e=>setNewBudget({...newBudget,date:e.target.value})}/></div>
            <div className="relative">
              <span className="lbl">Cliente *</span>
              <div className="relative"><Users className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15}/><input className="inp pl-9" required placeholder="Buscar o escribir cliente..." value={clientSearch} onChange={e=>{setClientSearch(e.target.value);setNewBudget({...newBudget,clientName:e.target.value});setShowClientDropdown(true);}} onFocus={()=>setShowClientDropdown(true)}/></div>
              {showClientDropdown && clientSearch && (
                <div className="absolute z-20 w-full bg-white border border-slate-200 rounded-2xl shadow-2xl mt-1 max-h-40 overflow-y-auto">
                  {clients.filter(c=>c.name.toLowerCase().includes(clientSearch.toLowerCase())).map(c=>(
                    <div key={c.id} onClick={()=>selectClient(c,'budget')} className="p-3 hover:bg-orange-50 cursor-pointer border-b border-slate-50 last:border-0">
                      <p className="font-bold text-sm">{c.name}</p><p className="text-xs text-slate-400">{c.phone}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div><span className="lbl">Teléfono cliente</span><input className="inp" placeholder="11-1234-5678" value={newBudget.clientPhone} onChange={e=>setNewBudget({...newBudget,clientPhone:e.target.value})}/></div>
            {newBudget.clientId && selectedClientVehicles(newBudget.clientId).length>0 && (
              <div><span className="lbl">Vehículos del cliente</span>
                <div className="flex gap-2 flex-wrap">
                  {selectedClientVehicles(newBudget.clientId).map((v,i)=>(
                    <button key={i} type="button" onClick={()=>selectVehicle(v,'budget')} className={`px-3 py-2 rounded-xl text-xs font-bold border-2 transition-all ${newBudget.plate===v.plate?'border-orange-500 bg-orange-50 text-orange-700':'border-slate-200 bg-slate-50 text-slate-600'}`}>
                      🚗 {v.make} {v.model} · <span className="font-mono">{v.plate}</span>
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
            <div><span className="lbl">Notas adicionales</span><textarea className="inp h-14 resize-none" placeholder="Validez, condiciones, garantía..." value={newBudget.notes} onChange={e=>setNewBudget({...newBudget,notes:e.target.value})}/></div>
            {(newBudget.partsUsed.length>0||Number(newBudget.laborCost)>0) && (
              <div className="rounded-2xl p-4 text-sm font-bold" style={{background:'#eff6ff',border:'1px solid #bfdbfe',color:'#1d4ed8'}}>
                💰 Total: ${(newBudget.partsUsed.reduce((s,p)=>s+(p.cost*p.qty),0)+Number(newBudget.laborCost)).toLocaleString()}
              </div>
            )}
            <button type="submit" className="btn-primary"><Save size={17}/>Guardar Presupuesto</button>
          </form>
        )}

        {/* CLIENTES */}
        {view==='clients' && (
          <div className="space-y-4 animate-slide-up">
            <div className="flex justify-between items-center">
              <h2 className="page-title">Clientes</h2>
              <button onClick={()=>setView('add_client')} className="btn-primary" style={{width:'auto',padding:'10px 16px',fontSize:'13px'}}><Plus size={15}/>Nuevo</button>
            </div>
            {clients.map(client=>(
              <div key={client.id} className="card p-5">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-bold text-slate-800">{client.name}</h4>
                    {client.phone && <p className="text-sm text-slate-500 mt-0.5">📞 {client.phone}</p>}
                    {client.email && <p className="text-xs text-slate-400">{client.email}</p>}
                  </div>
                  <button onClick={()=>deleteItem('clients',client.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-xl"><Trash2 size={15}/></button>
                </div>
                {Array.isArray(client.vehicles) && client.vehicles.length>0 && (
                  <div className="flex flex-wrap gap-2">
                    {client.vehicles.map((v,i)=>(
                      <div key={i} className="rounded-xl px-3 py-2 text-xs" style={{background:'#f8fafc',border:'1px solid #e8ecf2'}}>
                        <p className="font-bold text-slate-700">🚗 {typeof v==='object'?`${v.make||''} ${v.model||''} ${v.year||''}`.trim():v}</p>
                        {typeof v==='object'&&v.plate&&<p className="font-mono text-slate-400 mt-0.5">{v.plate}</p>}
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
          <form onSubmit={addClient} className="card p-6 space-y-4 max-w-lg mx-auto animate-slide-up">
            <div className="flex items-center gap-3">
              <button type="button" onClick={()=>setView('clients')} className="p-2 rounded-xl bg-slate-100"><ChevronLeft size={18}/></button>
              <h2 className="font-display font-black text-xl">Nuevo Cliente</h2>
            </div>
            <div><span className="lbl">Nombre *</span><input className="inp" required placeholder="Juan García" value={newClient.name} onChange={e=>setNewClient({...newClient,name:e.target.value})}/></div>
            <div className="grid grid-cols-2 gap-3">
              <div><span className="lbl">Teléfono</span><input className="inp" placeholder="11-1234-5678" value={newClient.phone} onChange={e=>setNewClient({...newClient,phone:e.target.value})}/></div>
              <div><span className="lbl">Email</span><input className="inp" type="email" placeholder="juan@email.com" value={newClient.email} onChange={e=>setNewClient({...newClient,email:e.target.value})}/></div>
            </div>
            <div className="rounded-2xl p-4 space-y-3" style={{background:'#f8fafc',border:'1.5px dashed #e2e8f0'}}>
              <p className="font-bold text-sm text-slate-600 flex items-center gap-2"><Car size={14} className="text-orange-500"/>Agregar vehículos</p>
              <div className="grid grid-cols-3 gap-2">
                <div><span className="lbl">Marca</span><input className="inp text-sm" placeholder="Toyota" value={newVehicle.make} onChange={e=>setNewVehicle({...newVehicle,make:e.target.value})}/></div>
                <div><span className="lbl">Modelo</span><input className="inp text-sm" placeholder="Corolla" value={newVehicle.model} onChange={e=>setNewVehicle({...newVehicle,model:e.target.value})}/></div>
                <div><span className="lbl">Año</span><input className="inp text-sm" placeholder="2018" value={newVehicle.year} onChange={e=>setNewVehicle({...newVehicle,year:e.target.value})}/></div>
                <div><span className="lbl">Patente</span><input className="inp text-sm uppercase font-mono" placeholder="ABC123" value={newVehicle.plate} onChange={e=>setNewVehicle({...newVehicle,plate:e.target.value.toUpperCase()})}/></div>
                <div><span className="lbl">KM</span><input className="inp text-sm" type="number" placeholder="75000" value={newVehicle.km} onChange={e=>setNewVehicle({...newVehicle,km:e.target.value})}/></div>
                <div className="flex items-end"><button type="button" onClick={addVehicleToForm} className="btn-dark w-full"><Plus size={14}/>Agregar</button></div>
              </div>
              {newClient.vehicles.map((v,i)=>(
                <div key={i} className="flex items-center justify-between bg-white rounded-xl px-3 py-2 shadow-sm">
                  <p className="text-sm font-bold">🚗 {v.make} {v.model} {v.year} · <span className="font-mono">{v.plate}</span></p>
                  <button type="button" onClick={()=>setNewClient(c=>({...c,vehicles:c.vehicles.filter((_,j)=>j!==i)}))} className="text-red-400 hover:text-red-600"><X size={14}/></button>
                </div>
              ))}
            </div>
            <button type="submit" className="btn-primary"><Save size={17}/>Guardar Cliente</button>
          </form>
        )}

        {/* HISTORIAL */}
        {view==='history' && (
          <div className="space-y-4 animate-slide-up">
            <h2 className="page-title">Historial por Vehículo</h2>
            <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15}/><input className="inp pl-9" placeholder="Buscar por patente o modelo..." value={vehicleFilter} onChange={e=>setVehicleFilter(e.target.value)}/></div>
            {vehicleFilter&&vehicleHistory.length===0&&<div className="card p-8 text-center text-slate-400 text-sm">Sin registros para "{vehicleFilter}"</div>}
            {vehicleHistory.sort((a,b)=>(b.date?.seconds||0)-(a.date?.seconds||0)).map(rep=>(
              <div key={rep.id} className="card p-5">
                <div className="flex justify-between items-start mb-1">
                  <div><h4 className="font-bold">{rep.vehicle} <span className="font-mono text-sm text-slate-400">{rep.plate}</span></h4>
                    <div className="flex gap-3 text-xs text-slate-400 mt-0.5">
                      {rep.km&&<span>🔢 {Number(rep.km).toLocaleString()} km</span>}
                      {rep.date?.seconds&&<span>📅 {new Date(rep.date.seconds*1000).toLocaleDateString('es-AR')}</span>}
                    </div>
                  </div>
                  <p className="font-black text-emerald-600 font-display">${rep.totalCost?.toLocaleString()}</p>
                </div>
                <p className="text-sm text-slate-600 mt-1">{rep.description}</p>
                {rep.notes&&<p className="text-xs text-slate-400 mt-1">📝 {rep.notes}</p>}
              </div>
            ))}
            {!vehicleFilter&&<div className="card p-16 text-center text-slate-400"><Clock size={40} className="mx-auto mb-3 opacity-20"/><p className="text-sm">Escribí una patente para ver el historial</p></div>}
          </div>
        )}

        {/* AGREGAR REPUESTO */}
        {view==='add' && (
          <form onSubmit={addProduct} className="card p-6 space-y-4 max-w-md mx-auto animate-slide-up">
            <div className="flex items-center gap-3">
              <button type="button" onClick={()=>setView('list')} className="p-2 rounded-xl bg-slate-100"><ChevronLeft size={18}/></button>
              <h2 className="font-display font-black text-xl">Nuevo Repuesto</h2>
            </div>
            <div><span className="lbl">Nombre *</span><input className="inp" required placeholder="Filtro de aceite" value={newProduct.name} onChange={e=>setNewProduct({...newProduct,name:e.target.value})}/></div>
            <div><span className="lbl">Descripción</span><input className="inp" placeholder="Marca, modelo compatible..." value={newProduct.description} onChange={e=>setNewProduct({...newProduct,description:e.target.value})}/></div>
            <div><span className="lbl">Ubicación</span><input className="inp" placeholder="Estante A, Cajón 2" value={newProduct.location} onChange={e=>setNewProduct({...newProduct,location:e.target.value})}/></div>
            <div>
              <span className="lbl">Foto del repuesto</span>
              <div className="flex gap-2 items-center">
                <button type="button" onClick={()=>startCamera('product')} className="btn-ghost flex-1"><Camera size={15}/>Tomar foto</button>
                <span className="text-xs text-slate-400">o</span>
                <input className="inp text-xs flex-1" placeholder="URL de imagen..." value={newProduct.imageUrl} onChange={e=>setNewProduct({...newProduct,imageUrl:e.target.value})}/>
              </div>
              {newProduct.imageUrl && <img src={newProduct.imageUrl} alt="preview" className="w-full h-28 object-cover rounded-2xl mt-2"/>}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><span className="lbl">Costo $</span><input className="inp" type="number" min="0" value={newProduct.cost} onChange={e=>setNewProduct({...newProduct,cost:e.target.value})}/></div>
              <div><span className="lbl">Stock</span><input className="inp" type="number" min="0" value={newProduct.quantity} onChange={e=>setNewProduct({...newProduct,quantity:e.target.value})}/></div>
              <div><span className="lbl">Mínimo</span><input className="inp" type="number" min="0" value={newProduct.minStock} onChange={e=>setNewProduct({...newProduct,minStock:e.target.value})}/></div>
            </div>
            <button type="submit" className="btn-primary"><Save size={17}/>Guardar Repuesto</button>
          </form>
        )}

        {/* ESCÁNER QR */}
        {view==='scan' && (
          <div className="fixed inset-0 z-[100] flex flex-col" style={{background:'#000'}}>
            <div className="flex items-center justify-between p-5">
              <button onClick={()=>setView('dashboard')} className="p-3 rounded-full text-white" style={{background:'rgba(255,255,255,0.1)'}}><X size={22}/></button>
              <p className="text-white font-bold">Escanear repuesto</p>
              <div style={{width:48}}/>
            </div>
            <div className="flex-1 relative flex items-center justify-center">
              <div id="qr-reader" className="w-full max-w-xs"/>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-64 h-64 border-2 border-orange-500 rounded-3xl" style={{boxShadow:'0 0 0 9999px rgba(0,0,0,0.6)'}}>
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-orange-500 rounded-tl-2xl"/>
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-orange-500 rounded-tr-2xl"/>
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-orange-500 rounded-bl-2xl"/>
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-orange-500 rounded-br-2xl"/>
                </div>
              </div>
            </div>
            <p className="text-white text-center pb-10 font-bold animate-pulse">Apuntá al código QR del repuesto</p>
          </div>
        )}

        {/* CÁMARA */}
        {view==='camera' && (
          <div className="fixed inset-0 z-[100] flex flex-col" style={{background:'#000'}}>
            <div className="flex items-center justify-between p-5 absolute top-0 left-0 right-0 z-10">
              <button onClick={()=>{setView(cameraTarget==='product'?'add':'add_repair');setCapturedPhoto(null);}} className="p-3 rounded-full text-white" style={{background:'rgba(0,0,0,0.5)'}}><X size={22}/></button>
              <p className="text-white font-bold text-sm">{capturedPhoto?'Revisar foto':'Tomar foto'}</p>
              {capturedPhoto && <button onClick={retakePhoto} className="p-3 rounded-full text-white" style={{background:'rgba(0,0,0,0.5)'}}><RefreshCw size={18}/></button>}
              {!capturedPhoto && <div style={{width:48}}/>}
            </div>
            <div className="flex-1 relative overflow-hidden">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" style={{display:capturedPhoto?'none':'block'}}/>
              {capturedPhoto && <img src={capturedPhoto} className="w-full h-full object-cover" alt="preview"/>}
              {!capturedPhoto && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-72 h-72 rounded-3xl border-2 border-white opacity-40"/>
                </div>
              )}
            </div>
            <div className="p-8 flex items-center justify-center gap-8" style={{background:'rgba(0,0,0,0.7)'}}>
              {!capturedPhoto ? (
                <button onClick={capturePhoto} className="shutter-btn" disabled={!cameraReady}>
                  <div className={`shutter-inner ${!cameraReady?'bg-slate-300':''}`}/>
                </button>
              ) : (
                <>
                  <button onClick={retakePhoto} className="flex flex-col items-center gap-2 text-white">
                    <div className="p-4 rounded-full" style={{background:'rgba(255,255,255,0.15)'}}><RefreshCw size={22}/></div>
                    <span className="text-xs font-bold">Repetir</span>
                  </button>
                  <button onClick={confirmPhoto} className="flex flex-col items-center gap-2 text-white">
                    <div className="p-4 rounded-full" style={{background:'linear-gradient(135deg,#f97316,#ea580c)'}}><Check size={22}/></div>
                    <span className="text-xs font-bold">Usar foto</span>
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* ESTADÍSTICAS */}
        {view==='stats' && (
          <div className="space-y-5 animate-slide-up">
            <div className="flex justify-between items-center">
              <h2 className="page-title">Estadísticas</h2>
              <select className="inp text-sm" style={{width:'auto',padding:'8px 12px'}} value={statsMonth} onChange={e=>setStatsMonth(Number(e.target.value))}>
                {MONTHS.map((m,i)=><option key={i} value={i}>{m}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                {label:'Ingresos del mes',value:`$${monthRevenue.toLocaleString()}`,from:'#10b981',to:'#059669',Icon:DollarSign},
                {label:'Servicios del mes',value:monthRepairs.length,from:'#3b82f6',to:'#2563eb',Icon:Car},
                {label:'Presupuestos',value:monthBudgets.length,from:'#8b5cf6',to:'#7c3aed',Icon:FileText},
                {label:'Total repuestos',value:inventory.length,from:'#f97316',to:'#ea580c',Icon:Package},
                {label:'Valor inventario',value:`$${inventory.reduce((s,p)=>s+(p.cost*p.quantity),0).toLocaleString()}`,from:'#ef4444',to:'#dc2626',Icon:TrendingUp},
                {label:'Clientes',value:clients.length,from:'#06b6d4',to:'#0891b2',Icon:Users},
              ].map(({label,value,from,to,Icon})=>(
                <div key={label} className="gradient-card text-white" style={{background:`linear-gradient(135deg,${from},${to})`}}>
                  <Icon size={18} className="opacity-70 mb-2"/>
                  <p className="text-2xl font-black font-display">{value}</p>
                  <p className="text-xs font-semibold opacity-70 uppercase tracking-wide mt-0.5">{label}</p>
                </div>
              ))}
            </div>
            {monthRepairs.length>0 && (
              <div className="card p-5">
                <p className="font-display font-bold mb-4">Servicios de {MONTHS[statsMonth]}</p>
                <div className="space-y-2">
                  {monthRepairs.map(r=>(
                    <div key={r.id} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
                      <div><p className="font-bold text-sm">{r.vehicle} <span className="font-mono text-xs text-slate-400">{r.plate}</span></p>
                        {r.date?.seconds&&<p className="text-xs text-slate-400">{new Date(r.date.seconds*1000).toLocaleDateString('es-AR')}</p>}
                      </div>
                      <p className="font-black text-emerald-600 font-display">${r.totalCost?.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between">
                  <span className="font-bold text-slate-600">Total del mes</span>
                  <span className="font-black text-xl text-emerald-600 font-display">${monthRevenue.toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ASISTENTE IA */}
        {view==='ai_assistant' && (
          <div className="card p-6 space-y-4 max-w-xl mx-auto animate-slide-up">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl" style={{background:'linear-gradient(135deg,#fbbf24,#f59e0b)'}}>
                <Sparkles size={20} className="text-white"/>
              </div>
              <div><h2 className="font-display font-black text-xl">Asistente IA</h2><p className="text-slate-500 text-xs">Diagnósticos y consultas técnicas</p></div>
            </div>
            <textarea className="inp h-36 resize-none" placeholder="Ej: Ford Focus 2012, ruido metálico al frenar en curva, vibración en el volante a más de 80km/h..." value={diagnosisQuery} onChange={e=>setDiagnosisQuery(e.target.value)}/>
            <button onClick={()=>askAI(`Soy mecánico. Problema: ${diagnosisQuery}. Dame diagnóstico probable, qué revisar primero y repuestos que podría necesitar.`)} disabled={aiLoading||!diagnosisQuery.trim()} className="btn-primary disabled:opacity-50">
              {aiLoading?<><Loader2 className="animate-spin" size={17}/>Analizando...</>:<><Sparkles size={17}/>Consultar IA</>}
            </button>
            {aiResponse && (
              <div className="rounded-2xl p-5 text-sm leading-relaxed whitespace-pre-wrap text-slate-700" style={{background:'#fffbeb',border:'1px solid #fde68a'}}>
                <p className="font-bold text-amber-700 mb-3 flex items-center gap-1.5 text-xs uppercase tracking-wide"><Sparkles size={12}/>Diagnóstico</p>
                {aiResponse}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Menú móvil */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white px-2 py-2 flex justify-around items-center z-50" style={{boxShadow:'0 -1px 0 rgba(0,0,0,0.08),0 -8px 24px rgba(0,0,0,0.06)',borderTop:'1px solid #f1f5f9'}}>
        {[
          {id:'dashboard',Icon:LayoutDashboard,label:'Panel'},
          {id:'list',Icon:Box,label:'Stock'},
          {id:'scan',Icon:QrCode,label:'Escanear',primary:true},
          {id:'repairs',Icon:Car,label:'Servicios'},
          {id:'budgets',Icon:FileText,label:'Presupuestos'},
        ].map(({id,Icon,label,primary})=>(
          <button key={id} onClick={()=>id==='scan'?startQRScan():setView(id)} className={`flex flex-col items-center gap-0.5 px-2 ${primary?'':view===id?'text-orange-500':'text-slate-400'}`} style={primary?{marginTop:'-20px'}:{}}>
            {primary?(
              <div className="p-3.5 rounded-full border-4 border-white shadow-lg" style={{background:'linear-gradient(135deg,#f97316,#ea580c)'}}>
                <Icon size={20} className="text-white"/>
              </div>
            ):<Icon size={20}/>}
            <span className={`text-[9px] font-bold ${primary?'text-orange-500':''}`}>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

function StatusPill({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pendiente;
  return <span className={`status-pill ${cfg.color}`}><span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`}/>{cfg.icon} {cfg.label}</span>;
}

function PartSelector({ inventory, parts, onChange }) {
  const [search, setSearch] = useState('');
  return (
    <div className="space-y-2">
      <span className="lbl">Repuestos utilizados</span>
      <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13}/><input className="inp pl-9 text-sm" placeholder="Buscar y agregar repuesto..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
      {search && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xl max-h-40 overflow-y-auto">
          {inventory.filter(i=>i.name.toLowerCase().includes(search.toLowerCase())&&i.quantity>0&&!parts.find(p=>p.id===i.id)).map(i=>(
            <div key={i.id} onClick={()=>{onChange([...parts,{id:i.id,name:i.name,qty:1,cost:i.cost}]);setSearch('');}} className="p-3 hover:bg-orange-50 cursor-pointer text-sm flex justify-between border-b border-slate-50 last:border-0">
              <span className="font-bold">{i.name}</span><span className="text-slate-400 text-xs">Stock: {i.quantity} · ${Number(i.cost).toLocaleString()}</span>
            </div>
          ))}
          {inventory.filter(i=>i.name.toLowerCase().includes(search.toLowerCase())).length===0&&<p className="p-3 text-slate-400 text-sm text-center">No encontrado</p>}
        </div>
      )}
      {parts.length>0 && (
        <div className="space-y-1.5">
          {parts.map((p,idx)=>(
            <div key={idx} className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={{background:'#f8fafc',border:'1px solid #e8ecf2'}}>
              <span className="text-sm font-bold flex-1 text-slate-700">{p.name}</span>
              <input type="number" min="1" value={p.qty} onChange={e=>{const np=[...parts];np[idx].qty=Number(e.target.value);onChange(np);}} className="inp text-center text-sm py-1 px-2" style={{width:'3.5rem'}}/>
              <span className="text-xs font-bold text-slate-500 w-20 text-right">${(p.cost*p.qty).toLocaleString()}</span>
              <button type="button" onClick={()=>onChange(parts.filter((_,i)=>i!==idx))} className="text-red-400 hover:text-red-600 p-1"><X size={14}/></button>
            </div>
          ))}
          <div className="text-right text-xs font-bold text-slate-400 pr-2">Subtotal: ${parts.reduce((s,p)=>s+(p.cost*p.qty),0).toLocaleString()}</div>
        </div>
      )}
    </div>
  );
}
