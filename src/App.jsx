import React, { useState, useEffect, useCallback, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getFirestore, collection, doc, onSnapshot, updateDoc,
  deleteDoc, query, addDoc, serverTimestamp, writeBatch, getDocs
} from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import {
  Plus, Search, MapPin, MinusCircle, PlusCircle, Camera, Trash2, X,
  ChevronLeft, LayoutDashboard, Box, Check, Sparkles, Wrench, Car,
  DollarSign, Save, Printer, Loader2, AlertCircle, Users, FileText,
  Clock, TrendingUp, BarChart3, RefreshCw, QrCode, ArrowRight,
  Edit3, Package, MessageCircle, Settings, Moon, Sun, History,
  CheckCircle, AlertTriangle, CreditCard, Award, Zap, ChevronRight
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

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const STATUS_CONFIG = {
  pendiente: { label: 'Pendiente', tw: 'bg-amber-100 text-amber-700', dot: 'bg-amber-400', icon: '⏳' },
  en_proceso: { label: 'En proceso', tw: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500', icon: '🔧' },
  listo: { label: 'Listo', tw: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500', icon: '✅' },
  entregado: { label: 'Entregado', tw: 'bg-slate-100 text-slate-500', dot: 'bg-slate-400', icon: '📦' },
};

const PAYMENT_CONFIG = {
  debe: { label: 'Debe', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', icon: '❌' },
  señado: { label: 'Señado', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', icon: '⚡' },
  pagado: { label: 'Pagado', color: '#10b981', bg: 'rgba(16,185,129,0.12)', icon: '✅' },
};

const DEFAULT_CONFIG = { nombre: 'Taller CheCk', direccion: 'Tu dirección', telefono: '3329677336', email: 'tu@email.com', logo: '' };

const EMPTY_REPAIR = { vehicle: '', plate: '', km: '', clientId: '', clientName: '', description: '', partsUsed: [], laborCost: 0, status: 'pendiente', paymentStatus: 'debe', imageUrl: '', notes: '', orderNumber: '' };
const EMPTY_BUDGET = { clientId: '', clientName: '', clientPhone: '', vehicle: '', plate: '', km: '', description: '', partsUsed: [], laborCost: 0, notes: '', date: new Date().toISOString().split('T')[0] };
const EMPTY_CLIENT = { name: '', phone: '', email: '', vehicles: [] };
const EMPTY_VEHICLE = { make: '', model: '', year: '', plate: '', km: '', clientId: '', clientName: '' };
const EMPTY_PRODUCT = { name: '', sku: '', location: '', quantity: 0, minStock: 1, cost: 0, imageUrl: '', description: '', supplier: '', supplierPhone: '' };

export default function App() {
  const [user, setUser] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [repairs, setRepairs] = useState([]);
  const [clients, setClients] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [stockHistory, setStockHistory] = useState([]);
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
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('tm_dark') === '1');
  const [tallerConfig, setTallerConfig] = useState(() => { try { return JSON.parse(localStorage.getItem('tm_config')) || DEFAULT_CONFIG; } catch { return DEFAULT_CONFIG; } });
  const [editConfig, setEditConfig] = useState(null);
  const [orderCounter, setOrderCounter] = useState(() => parseInt(localStorage.getItem('tm_order') || '0'));

  // Camera
  const videoRef = useRef(null);
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraTarget, setCameraTarget] = useState(null);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);

  // QR
  const [scannedProduct, setScannedProduct] = useState(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrAction, setQrAction] = useState(null);
  const [selectedRepairForQR, setSelectedRepairForQR] = useState('');
  const [qrQty, setQrQty] = useState(1);

  // Forms
  const [newProduct, setNewProduct] = useState(EMPTY_PRODUCT);
  const [editingProduct, setEditingProduct] = useState(null);
  const [newRepair, setNewRepair] = useState(EMPTY_REPAIR);
  const [editingRepair, setEditingRepair] = useState(null);
  const [newBudget, setNewBudget] = useState(EMPTY_BUDGET);
  const [editingBudget, setEditingBudget] = useState(null);
  const [newClient, setNewClient] = useState(EMPTY_CLIENT);
  const [editingClient, setEditingClient] = useState(null);
  const [newVehicleForm, setNewVehicleForm] = useState(EMPTY_VEHICLE);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [tempVehicle, setTempVehicle] = useState({ make: '', model: '', year: '', plate: '', km: '' });
  const [clientSearch, setClientSearch] = useState('');
  const [clientSearchB, setClientSearchB] = useState('');
  const [showClientDD, setShowClientDD] = useState(false);
  const [showClientDDB, setShowClientDDB] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null); // {col, id, label}
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(null); // col name

  const showNotif = useCallback((msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('tm_dark', darkMode ? '1' : '0');
  }, [darkMode]);

  useEffect(() => {
    signInAnonymously(auth).catch(console.error);
    return onAuthStateChanged(auth, u => { setUser(u); setLoading(false); });
  }, []);

  useEffect(() => {
    if (!user) return;
    const cols = [
      { name: 'inventory', setter: setInventory, extra: items => setSelectedProduct(p => p ? items.find(i => i.id === p.id) || p : null) },
      { name: 'repairs', setter: setRepairs },
      { name: 'clients', setter: setClients },
      { name: 'budgets', setter: setBudgets },
      { name: 'vehicles', setter: setVehicles },
      { name: 'stock_history', setter: setStockHistory },
    ];
    const unsubs = cols.map(({ name, setter, extra }) => {
      const ref = collection(db, 'artifacts', appId, 'public', 'data', name);
      return onSnapshot(query(ref), snap => {
        const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setter(items);
        if (extra) extra(items);
      }, console.error);
    });
    return () => unsubs.forEach(u => u());
  }, [user]);

  // Dark mode helpers
  const c = {
    bg: darkMode ? 'bg-[#0d1117]' : 'bg-[#f0f2f7]',
    card: darkMode ? 'bg-[#161b22] border-[#30363d]' : 'bg-white border-white/80',
    cardBg: darkMode ? '#161b22' : 'white',
    text: darkMode ? 'text-white' : 'text-slate-900',
    sub: darkMode ? 'text-slate-400' : 'text-slate-500',
    border: darkMode ? 'border-[#30363d]' : 'border-slate-200',
    inp: darkMode ? 'bg-[#0d1117] border-[#30363d] text-white placeholder-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900',
    nav: darkMode ? 'bg-[#010409]' : 'bg-[#0a0f1e]',
    mobileNav: darkMode ? 'bg-[#161b22]' : 'bg-white',
  };

  // Camera
  const startCamera = async target => {
    setCameraTarget(target); setCapturedPhoto(null); setCameraReady(false);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setCameraStream(s); setView('camera');
    } catch { showNotif("Sin acceso a cámara", "error"); }
  };

  useEffect(() => {
    if (view === 'camera' && cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.onloadedmetadata = () => setCameraReady(true);
    }
    if (view !== 'camera' && cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop());
      setCameraStream(null); setCameraReady(false);
    }
  }, [view, cameraStream]);

  const capturePhoto = () => {
    if (!videoRef.current || !cameraReady) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
    setCapturedPhoto(canvas.toDataURL('image/jpeg', 0.82));
  };

  const confirmPhoto = () => {
    if (cameraTarget === 'product') setNewProduct(p => ({ ...p, imageUrl: capturedPhoto }));
    if (cameraTarget === 'editProduct') setEditingProduct(p => ({ ...p, imageUrl: capturedPhoto }));
    if (cameraTarget === 'repair') setNewRepair(r => ({ ...r, imageUrl: capturedPhoto }));
    if (cameraTarget === 'editRepair') setEditingRepair(r => ({ ...r, imageUrl: capturedPhoto }));
    const backView = { product: 'add', editProduct: 'edit_product', repair: 'add_repair', editRepair: 'edit_repair' };
    setView(backView[cameraTarget] || 'dashboard');
    setCapturedPhoto(null);
  };

  // QR
  const startQRScan = () => {
    if (!document.getElementById('qr-sc')) {
      const s = document.createElement('script');
      s.id = 'qr-sc'; s.src = "https://unpkg.com/html5-qrcode"; s.async = true;
      document.body.appendChild(s);
    }
    setView('scan');
  };

  useEffect(() => {
    let qr = null;
    if (view === 'scan') {
      const go = async () => {
        if (!window.Html5Qrcode) { setTimeout(go, 500); return; }
        try {
          qr = new window.Html5Qrcode("qr-reader");
          await qr.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 250, height: 250 } },
            text => {
              const found = inventory.find(p => p.sku === text || p.id === text);
              if (found) { setScannedProduct(found); setQrQty(1); setSelectedRepairForQR(''); setQrAction(null); setShowQRModal(true); }
              else showNotif("QR no encontrado", "error");
              setView('dashboard');
              qr.stop().catch(() => {});
            }, () => {});
        } catch { setView('dashboard'); }
      };
      setTimeout(go, 800);
    }
    return () => { if (qr?.isScanning) qr.stop().catch(() => {}); };
  }, [view, inventory, showNotif]);

  // Order number
  const nextOrder = () => {
    const n = orderCounter + 1;
    setOrderCounter(n);
    localStorage.setItem('tm_order', String(n));
    return `ORD-${String(n).padStart(4, '0')}`;
  };

  // Stock history
  const logStock = async (productId, productName, delta, reason) => {
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'stock_history'), {
      productId, productName, delta, reason, date: serverTimestamp()
    });
  };

  // Client helpers
  const getClientVehicles = id => vehicles.filter(v => v.clientId === id);

  const selectClient = (client, target) => {
    if (target === 'repair') setNewRepair(r => ({ ...r, clientId: client.id, clientName: client.name }));
    if (target === 'editRepair') setEditingRepair(r => ({ ...r, clientId: client.id, clientName: client.name }));
    if (target === 'budget') setNewBudget(b => ({ ...b, clientId: client.id, clientName: client.name, clientPhone: client.phone || '' }));
    if (target === 'editBudget') setEditingBudget(b => ({ ...b, clientId: client.id, clientName: client.name, clientPhone: client.phone || '' }));
    const isRepair = target.includes('epair');
    if (isRepair) { setClientSearch(client.name); setShowClientDD(false); }
    else { setClientSearchB(client.name); setShowClientDDB(false); }
  };

  const selectVehicle = (v, setter) => {
    const vStr = `${v.make || ''} ${v.model || ''} ${v.year || ''}`.trim();
    setter(f => ({ ...f, vehicle: vStr, plate: v.plate || '', km: v.km || '' }));
  };

  // AI
  const askAI = async prompt => {
    setAiLoading(true); setAiResponse('');
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], systemInstruction: { parts: [{ text: "Sos un experto jefe de taller mecánico argentino. Respondé en español rioplatense, claro y práctico." }] } })
      });
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error();
      setAiResponse(text);
    } catch { setAiResponse("⚠️ La IA no responde. Verificá tu API key en aistudio.google.com"); }
    finally { setAiLoading(false); }
  };

  // Delete single
  const deleteItem = (col, id, label) => setConfirmDelete({ col, id, label });
  const confirmDeleteItem = async () => {
    if (!confirmDelete) return;
    await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', confirmDelete.col, confirmDelete.id));
    showNotif("Eliminado");
    setConfirmDelete(null);
    if (view === 'details' || view === 'edit_product') setView('list');
  };

  // Delete all
  const deleteAll = col => setConfirmDeleteAll(col);
  const confirmDeleteAllItems = async () => {
    if (!confirmDeleteAll) return;
    const ref = collection(db, 'artifacts', appId, 'public', 'data', confirmDeleteAll);
    const snap = await getDocs(ref);
    const batch = writeBatch(db);
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
    showNotif("Todo eliminado");
    setConfirmDeleteAll(null);
  };

  // CRUD Products
  const saveProduct = async e => {
    e.preventDefault();
    const sku = newProduct.sku || `REP-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    try {
      const docRef = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'inventory'), { ...newProduct, sku, quantity: Number(newProduct.quantity), cost: Number(newProduct.cost), minStock: Number(newProduct.minStock), createdAt: serverTimestamp() });
      await logStock(docRef.id, newProduct.name, Number(newProduct.quantity), 'Stock inicial');
      setNewProduct(EMPTY_PRODUCT); setView('list'); showNotif("✓ Repuesto guardado");
    } catch { showNotif("Error", "error"); }
  };

  const updateProduct = async e => {
    e.preventDefault();
    try {
      const original = inventory.find(i => i.id === editingProduct.id);
      const delta = Number(editingProduct.quantity) - (original?.quantity || 0);
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'inventory', editingProduct.id), { ...editingProduct, quantity: Number(editingProduct.quantity), cost: Number(editingProduct.cost), minStock: Number(editingProduct.minStock) });
      if (delta !== 0) await logStock(editingProduct.id, editingProduct.name, delta, 'Ajuste manual');
      setEditingProduct(null); setView('list'); showNotif("✓ Actualizado");
    } catch { showNotif("Error", "error"); }
  };

  // CRUD Repairs
  const saveRepair = async e => {
    e.preventDefault();
    const batch = writeBatch(db);
    const orderNum = nextOrder();
    const ref = doc(collection(db, 'artifacts', appId, 'public', 'data', 'repairs'));
    const partsCost = newRepair.partsUsed.reduce((s, p) => s + (p.cost * p.qty), 0);
    const total = partsCost + Number(newRepair.laborCost);
    batch.set(ref, { ...newRepair, orderNumber: orderNum, date: serverTimestamp(), totalCost: total, partsCost, laborCost: Number(newRepair.laborCost) });
    newRepair.partsUsed.forEach(part => {
      const orig = inventory.find(i => i.id === part.id);
      if (orig) batch.update(doc(db, 'artifacts', appId, 'public', 'data', 'inventory', part.id), { quantity: Math.max(0, orig.quantity - part.qty) });
    });
    await batch.commit();
    for (const part of newRepair.partsUsed) await logStock(part.id, part.name, -part.qty, `Servicio ${orderNum}`);
    setNewRepair(EMPTY_REPAIR); setClientSearch(''); setView('repairs'); showNotif(`✓ Servicio ${orderNum} creado`);
  };

  const updateRepair = async e => {
    e.preventDefault();
    const partsCost = editingRepair.partsUsed.reduce((s, p) => s + (p.cost * p.qty), 0);
    const total = partsCost + Number(editingRepair.laborCost);
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'repairs', editingRepair.id), { ...editingRepair, totalCost: total, partsCost, laborCost: Number(editingRepair.laborCost) });
      setEditingRepair(null); setClientSearch(''); setView('repairs'); showNotif("✓ Servicio actualizado");
    } catch { showNotif("Error", "error"); }
  };

  const updateRepairField = async (id, field, value) => {
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'repairs', id), { [field]: value });
  };

  // CRUD Budgets
  const saveBudget = async e => {
    e.preventDefault();
    const partsCost = newBudget.partsUsed.reduce((s, p) => s + (p.cost * p.qty), 0);
    const total = partsCost + Number(newBudget.laborCost);
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'budgets'), { ...newBudget, createdAt: serverTimestamp(), totalCost: total, partsCost, laborCost: Number(newBudget.laborCost) });
      setNewBudget(EMPTY_BUDGET); setClientSearchB(''); setView('budgets'); showNotif("✓ Presupuesto guardado");
    } catch { showNotif("Error", "error"); }
  };

  const updateBudget = async e => {
    e.preventDefault();
    const partsCost = editingBudget.partsUsed.reduce((s, p) => s + (p.cost * p.qty), 0);
    const total = partsCost + Number(editingBudget.laborCost);
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'budgets', editingBudget.id), { ...editingBudget, totalCost: total, partsCost, laborCost: Number(editingBudget.laborCost) });
      setEditingBudget(null); setClientSearchB(''); setView('budgets'); showNotif("✓ Presupuesto actualizado");
    } catch { showNotif("Error", "error"); }
  };

  const openConvertToBudget = repair => {
    setNewBudget({ clientId: repair.clientId || '', clientName: repair.clientName || '', clientPhone: '', vehicle: repair.vehicle || '', plate: repair.plate || '', km: repair.km || '', description: repair.description || '', partsUsed: repair.partsUsed || [], laborCost: repair.laborCost || 0, notes: repair.notes || '', date: new Date().toISOString().split('T')[0] });
    setClientSearchB(repair.clientName || '');
    setView('add_budget');
    showNotif("Datos del servicio cargados");
  };

  // CRUD Clients
  const saveClient = async e => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'clients'), { ...newClient, vehicles: [], createdAt: serverTimestamp() });
      setNewClient(EMPTY_CLIENT); setTempVehicle({ make: '', model: '', year: '', plate: '', km: '' }); setView('clients'); showNotif("✓ Cliente guardado");
    } catch { showNotif("Error", "error"); }
  };

  const updateClient = async e => {
    e.preventDefault();
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'clients', editingClient.id), { name: editingClient.name, phone: editingClient.phone, email: editingClient.email });
      setEditingClient(null); setView('clients'); showNotif("✓ Cliente actualizado");
    } catch { showNotif("Error", "error"); }
  };

  // CRUD Vehicles
  const saveVehicle = async e => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'vehicles'), { ...newVehicleForm, createdAt: serverTimestamp() });
      setNewVehicleForm(EMPTY_VEHICLE); setView('vehicles_list'); showNotif("✓ Vehículo guardado");
    } catch { showNotif("Error", "error"); }
  };

  const updateVehicle = async e => {
    e.preventDefault();
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'vehicles', editingVehicle.id), { ...editingVehicle });
      setEditingVehicle(null); setView('vehicles_list'); showNotif("✓ Vehículo actualizado");
    } catch { showNotif("Error", "error"); }
  };

  // Update stock
  const updateStock = async (id, delta, reason = 'Ajuste manual') => {
    const item = inventory.find(i => i.id === id);
    if (!item) return;
    const newQty = Math.max(0, item.quantity + delta);
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'inventory', id), { quantity: newQty });
    await logStock(id, item.name, delta, reason);
  };

  // QR Actions
  const handleQRDeduct = async () => {
    if (!scannedProduct) return;
    await updateStock(scannedProduct.id, -qrQty, 'Escaneo QR');
    showNotif(`✓ Stock actualizado`); setShowQRModal(false);
  };

  const handleQRAddToService = async () => {
    if (!scannedProduct || !selectedRepairForQR) return;
    const repair = repairs.find(r => r.id === selectedRepairForQR);
    if (!repair) return;
    const existingParts = repair.partsUsed || [];
    const idx = existingParts.findIndex(p => p.id === scannedProduct.id);
    const updatedParts = idx >= 0 ? existingParts.map((p, i) => i === idx ? { ...p, qty: p.qty + qrQty } : p) : [...existingParts, { id: scannedProduct.id, name: scannedProduct.name, qty: qrQty, cost: scannedProduct.cost }];
    const partsCost = updatedParts.reduce((s, p) => s + (p.cost * p.qty), 0);
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'repairs', selectedRepairForQR), { partsUsed: updatedParts, partsCost, totalCost: partsCost + Number(repair.laborCost || 0) });
    await updateStock(scannedProduct.id, -qrQty, `Servicio ${repair.orderNumber || repair.vehicle}`);
    showNotif(`✓ Agregado al servicio`); setShowQRModal(false);
  };

  // WhatsApp
  const sendWhatsApp = budget => {
    const phone = budget.clientPhone?.replace(/\D/g, '');
    if (!phone) { showNotif("El cliente no tiene teléfono", "error"); return; }
    const msg = encodeURIComponent(`Hola ${budget.clientName}! Te envío el presupuesto de ${tallerConfig.nombre}:\n\n🚗 ${budget.vehicle} (${budget.plate || 'sin patente'})\n📋 ${budget.description || 'Sin descripción'}\n\n💰 Total: $${budget.totalCost?.toLocaleString()}\n\nCualquier consulta, ¡avisame!`);
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
  };

  // Config
  const saveConfig = () => {
    setTallerConfig(editConfig);
    localStorage.setItem('tm_config', JSON.stringify(editConfig));
    setEditConfig(null);
    showNotif("✓ Configuración guardada");
  };

  // Print
  const printBudget = budget => {
    const win = window.open('', '_blank');
    const dateStr = budget.date ? new Date(budget.date + 'T12:00:00').toLocaleDateString('es-AR') : new Date().toLocaleDateString('es-AR');
    win.document.write(`<!DOCTYPE html><html><head><title>Presupuesto - ${budget.clientName}</title>
    <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Arial,sans-serif;padding:40px;color:#1e293b;max-width:820px;margin:0 auto}
    .header{display:flex;justify-content:space-between;padding-bottom:24px;margin-bottom:28px;border-bottom:3px solid #0f172a}
    h1{font-size:28px;font-weight:900;color:#0f172a}.sub{font-size:12px;color:#64748b;margin-top:5px;line-height:1.6}
    .doc-title{font-size:20px;font-weight:900;color:#0f172a;text-transform:uppercase;letter-spacing:2px;text-align:right}.date{font-size:12px;color:#94a3b8;text-align:right;margin-top:4px}
    .sec{margin:20px 0}.sec-title{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;color:#94a3b8;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid #f1f5f9}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.item label{font-size:10px;color:#94a3b8;font-weight:700;text-transform:uppercase;display:block;margin-bottom:2px}.item span{font-size:14px;font-weight:700}
    table{width:100%;border-collapse:collapse}thead tr{background:#0f172a}th{padding:10px 14px;text-align:left;font-size:11px;font-weight:700;color:white;text-transform:uppercase}
    td{padding:10px 14px;font-size:13px;border-bottom:1px solid #f1f5f9}tr:nth-child(even) td{background:#f8fafc}.labor td{background:#f1f5f9;font-weight:700}
    .total{background:#0f172a;color:white;padding:18px 22px;border-radius:12px;display:flex;justify-content:space-between;align-items:center;margin-top:20px}
    .total-label{font-size:12px;opacity:0.6;text-transform:uppercase;letter-spacing:1px}.total-value{font-size:26px;font-weight:900}
    .notes{background:#fffbeb;border:1px solid #fde68a;padding:14px;border-radius:10px;font-size:13px;color:#92400e;margin-top:16px}
    .footer{margin-top:32px;padding-top:16px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between}
    .footer p{font-size:11px;color:#94a3b8}.validity{background:#f0fdf4;color:#166534;padding:5px 14px;border-radius:20px;font-size:11px;font-weight:700}
    </style></head><body>
    <div class="header"><div><h1>${tallerConfig.nombre}</h1><p class="sub">${tallerConfig.direccion}<br>${tallerConfig.telefono} · ${tallerConfig.email}</p></div>
    <div><div class="doc-title">Presupuesto</div><div class="date">Fecha: ${dateStr}</div></div></div>
    <div class="sec"><div class="sec-title">Cliente</div><div class="grid">
    <div class="item"><label>Nombre</label><span>${budget.clientName}</span></div>
    <div class="item"><label>Teléfono</label><span>${budget.clientPhone || '—'}</span></div></div></div>
    <div class="sec"><div class="sec-title">Vehículo</div><div class="grid">
    <div class="item"><label>Vehículo</label><span>${budget.vehicle}</span></div>
    <div class="item"><label>Patente</label><span>${budget.plate || '—'}</span></div>
    ${budget.km ? `<div class="item"><label>Km</label><span>${Number(budget.km).toLocaleString()} km</span></div>` : ''}
    </div></div>
    ${budget.description ? `<div class="sec"><div class="sec-title">Trabajo</div><p style="font-size:14px;line-height:1.7">${budget.description}</p></div>` : ''}
    <div class="sec"><div class="sec-title">Detalle</div>
    <table><thead><tr><th>Descripción</th><th>Cant.</th><th>Precio unit.</th><th>Subtotal</th></tr></thead><tbody>
    ${(budget.partsUsed || []).map(p => `<tr><td>${p.name}</td><td>${p.qty}</td><td>$${Number(p.cost).toLocaleString()}</td><td>$${(p.cost * p.qty).toLocaleString()}</td></tr>`).join('')}
    <tr class="labor"><td colspan="3">Mano de obra</td><td>$${Number(budget.laborCost || 0).toLocaleString()}</td></tr>
    </tbody></table></div>
    <div class="total"><span class="total-label">Total</span><span class="total-value">$${(budget.totalCost || 0).toLocaleString()}</span></div>
    ${budget.notes ? `<div class="notes">📝 ${budget.notes}</div>` : ''}
    <div class="footer"><p>${tallerConfig.nombre} · ${tallerConfig.telefono}</p><span class="validity">✓ Válido 15 días</span></div>
    </body></html>`);
    win.document.close(); win.print();
  };

  const printQRLabel = product => {
    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html><html><head><title>Etiqueta</title><style>body{margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh}.label{width:6cm;padding:8px;border:1.5px solid #000;display:flex;flex-direction:column;align-items:center;gap:4px;font-family:Arial}.name{font-size:8px;font-weight:900;text-align:center;text-transform:uppercase}.sku{font-size:6px;color:#666;font-family:monospace}.loc{font-size:6px;color:#999}</style></head><body>
    <div class="label"><div class="name">${product.name}</div><img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${product.sku}" style="width:3.5cm;height:3.5cm"/><div class="sku">${product.sku}</div>${product.location ? `<div class="loc">📍 ${product.location}</div>` : ''}</div>
    <script>window.onload=()=>setTimeout(()=>window.print(),500)</script></body></html>`);
    win.document.close();
  };

  // Stats
  const monthRepairs = repairs.filter(r => r.date?.seconds && new Date(r.date.seconds * 1000).getMonth() === statsMonth);
  const monthRevenue = monthRepairs.reduce((s, r) => s + (r.totalCost || 0), 0);
  const vehicleHistory = repairs.filter(r => vehicleFilter && (r.plate?.toLowerCase().includes(vehicleFilter.toLowerCase()) || r.vehicle?.toLowerCase().includes(vehicleFilter.toLowerCase())));
  const globalResults = globalSearch.length > 1 ? {
    inventory: inventory.filter(i => i.name?.toLowerCase().includes(globalSearch.toLowerCase())),
    repairs: repairs.filter(r => r.vehicle?.toLowerCase().includes(globalSearch.toLowerCase()) || r.plate?.toLowerCase().includes(globalSearch.toLowerCase()) || r.clientName?.toLowerCase().includes(globalSearch.toLowerCase())),
    clients: clients.filter(c => c.name?.toLowerCase().includes(globalSearch.toLowerCase()) || c.phone?.includes(globalSearch)),
    vehicles: vehicles.filter(v => v.plate?.toLowerCase().includes(globalSearch.toLowerCase()) || `${v.make} ${v.model}`.toLowerCase().includes(globalSearch.toLowerCase())),
  } : null;

  // Chart data (last 6 months)
  const chartData = Array.from({ length: 6 }, (_, i) => {
    const month = (new Date().getMonth() - 5 + i + 12) % 12;
    const year = new Date().getFullYear() - (new Date().getMonth() - 5 + i < 0 ? 1 : 0);
    const total = repairs.filter(r => {
      if (!r.date?.seconds) return false;
      const d = new Date(r.date.seconds * 1000);
      return d.getMonth() === month && d.getFullYear() === year;
    }).reduce((s, r) => s + (r.totalCost || 0), 0);
    return { month: MONTHS[month].slice(0, 3), total };
  });
  const chartMax = Math.max(...chartData.map(d => d.total), 1);

  // Top services
  const serviceCounts = {};
  repairs.forEach(r => { const k = r.description?.split(' ').slice(0, 3).join(' ') || 'Sin descripción'; serviceCounts[k] = (serviceCounts[k] || 0) + 1; });
  const topServices = Object.entries(serviceCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Top parts
  const partCounts = {};
  repairs.forEach(r => r.partsUsed?.forEach(p => { partCounts[p.name] = (partCounts[p.name] || 0) + p.qty; }));
  const topParts = Object.entries(partCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: '#0d1117' }}>
      <div className="p-4 rounded-2xl mb-5" style={{ background: 'linear-gradient(135deg,#f97316,#ea580c)' }}><Wrench size={36} className="text-white" /></div>
      <p className="font-black text-2xl text-white">TallerMaster</p>
      <p className="text-slate-500 text-sm mt-2 flex items-center gap-2"><Loader2 className="animate-spin" size={14} />Iniciando...</p>
    </div>
  );

  const dm = darkMode;

  return (
    <div className={`min-h-screen font-sans pb-24 md:pb-0 md:pl-64 transition-colors duration-300 ${dm ? 'bg-[#0d1117] text-white' : 'bg-[#f0f2f7] text-slate-900'}`}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap');
        *{font-family:'DM Sans',sans-serif} .font-display{font-family:'Syne',sans-serif}
        .page-title{font-family:'Syne',sans-serif;font-size:26px;font-weight:900;letter-spacing:-0.8px}
        .card{border-radius:24px;box-shadow:0 2px 8px rgba(0,0,0,0.08);transition:all 0.2s}
        .card-hover:hover{transform:translateY(-3px);box-shadow:0 12px 32px rgba(0,0,0,0.15)}
        .inp{border-radius:12px;padding:11px 14px;width:100%;outline:none;transition:all 0.2s;font-size:14px;border:1.5px solid}
        .inp:focus{border-color:#f97316 !important;box-shadow:0 0 0 4px rgba(249,115,22,0.08)}
        .btn-primary{background:linear-gradient(135deg,#f97316,#ea580c);color:white;padding:13px 20px;border-radius:14px;font-weight:700;display:flex;align-items:center;gap:8px;justify-content:center;cursor:pointer;border:none;width:100%;font-size:15px;box-shadow:0 4px 16px rgba(249,115,22,0.35);transition:all 0.2s}
        .btn-primary:hover{transform:translateY(-1px);box-shadow:0 8px 24px rgba(249,115,22,0.4)}.btn-primary:disabled{opacity:0.5;transform:none;cursor:not-allowed}
        .btn-dark{background:#0f172a;color:white;padding:9px 16px;border-radius:11px;font-weight:700;display:flex;align-items:center;gap:6px;justify-content:center;cursor:pointer;border:none;font-size:13px;transition:all 0.2s}.btn-dark:hover{background:#1e293b}
        .btn-ghost{padding:9px 14px;border-radius:11px;font-weight:600;display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;transition:all 0.2s;border:1.5px solid}
        .lbl{font-size:11px;font-weight:700;color:#64748b;margin-bottom:5px;text-transform:uppercase;letter-spacing:0.8px;display:block}
        .status-pill{padding:5px 11px;border-radius:20px;font-size:11px;font-weight:700;display:inline-flex;align-items:center;gap:5px}
        .nav-item{width:100%;display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:12px;font-size:13px;font-weight:600;transition:all 0.2s;cursor:pointer;border:none;text-align:left}
        .nav-item.active{background:linear-gradient(135deg,#f97316,#ea580c);color:white;box-shadow:0 4px 14px rgba(249,115,22,0.35)}.nav-item:not(.active){color:#64748b}.nav-item:not(.active):hover{background:rgba(255,255,255,0.06);color:white}
        .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.65);backdrop-filter:blur(10px);z-index:300;display:flex;align-items:center;justify-content:center;padding:20px}
        .g-card{border-radius:20px;padding:22px;overflow:hidden;position:relative}
        .shutter-btn{width:72px;height:72px;border-radius:50%;background:white;border:4px solid rgba(255,255,255,0.4);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all 0.15s;box-shadow:0 4px 20px rgba(0,0,0,0.4)}.shutter-btn:active{transform:scale(0.92)}
        .shutter-inner{width:56px;height:56px;border-radius:50%;background:white;border:2px solid #e2e8f0}
        @keyframes slideUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}.anim{animation:slideUp 0.25s ease-out}
        @keyframes pulse2{0%,100%{opacity:1}50%{opacity:.5}}.pulse2{animation:pulse2 1.5s ease-in-out infinite}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#374151;border-radius:4px}
      `}</style>

      {/* CONFIRM DELETE SINGLE */}
      {confirmDelete && (
        <div className="modal-overlay">
          <div className={`${dm ? 'bg-[#161b22]' : 'bg-white'} rounded-3xl p-7 max-w-sm w-full`}>
            <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center bg-red-100"><Trash2 size={26} className="text-red-600" /></div>
            <h3 className={`font-display font-black text-xl text-center mb-2 ${dm ? 'text-white' : 'text-slate-900'}`}>¿Eliminar?</h3>
            <p className={`text-center text-sm mb-6 ${dm ? 'text-slate-400' : 'text-slate-500'}`}>{confirmDelete.label}</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className={`btn-ghost flex-1 ${dm ? 'border-[#30363d] text-slate-300' : 'border-slate-200 text-slate-600'}`}>Cancelar</button>
              <button onClick={confirmDeleteItem} className="btn-primary flex-1" style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)' }}><Trash2 size={16} />Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE ALL */}
      {confirmDeleteAll && (
        <div className="modal-overlay">
          <div className={`${dm ? 'bg-[#161b22]' : 'bg-white'} rounded-3xl p-7 max-w-sm w-full`}>
            <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center bg-red-100"><AlertTriangle size={26} className="text-red-600" /></div>
            <h3 className={`font-display font-black text-xl text-center mb-2 ${dm ? 'text-white' : 'text-slate-900'}`}>¿Eliminar todo?</h3>
            <p className={`text-center text-sm mb-6 ${dm ? 'text-slate-400' : 'text-slate-500'}`}>Esta acción no se puede deshacer</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteAll(null)} className={`btn-ghost flex-1 ${dm ? 'border-[#30363d] text-slate-300' : 'border-slate-200 text-slate-600'}`}>Cancelar</button>
              <button onClick={confirmDeleteAllItems} className="btn-primary flex-1" style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)' }}><Trash2 size={16} />Eliminar todo</button>
            </div>
          </div>
        </div>
      )}

      {/* QR MODAL */}
      {showQRModal && scannedProduct && (
        <div className="modal-overlay" onClick={() => setShowQRModal(false)}>
          <div className={`${dm ? 'bg-[#161b22]' : 'bg-white'} rounded-3xl p-6 max-w-sm w-full`} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <div><p className="text-xs font-bold text-orange-500 uppercase tracking-widest mb-1">Escaneado</p>
                <h3 className={`font-display font-black text-xl ${dm ? 'text-white' : ''}`}>{scannedProduct.name}</h3>
                <p className="font-mono text-xs text-slate-400 mt-0.5">{scannedProduct.sku}</p></div>
              <button onClick={() => setShowQRModal(false)} className={`p-2 rounded-xl ${dm ? 'hover:bg-[#0d1117]' : 'hover:bg-slate-100'}`}><X size={18} /></button>
            </div>
            {scannedProduct.imageUrl && <img src={scannedProduct.imageUrl} alt="" className="w-full h-32 object-cover rounded-2xl mb-4" />}
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[{ label: 'Stock', val: scannedProduct.quantity, red: scannedProduct.quantity <= scannedProduct.minStock }, { label: 'Costo', val: `$${Number(scannedProduct.cost).toLocaleString()}` }, { label: 'Ubic.', val: scannedProduct.location || '—' }].map(({ label, val, red }) => (
                <div key={label} className={`rounded-2xl p-3 text-center ${dm ? 'bg-[#0d1117]' : 'bg-slate-50'}`}>
                  <p className={`text-lg font-black font-display truncate ${red ? 'text-red-500' : ''}`}>{val}</p>
                  <p className="text-xs text-slate-400 font-bold uppercase">{label}</p>
                </div>
              ))}
            </div>
            <div className={`flex items-center justify-center gap-4 rounded-2xl p-3 mb-4 ${dm ? 'bg-[#0d1117]' : 'bg-slate-50'}`}>
              <button onClick={() => setQrQty(q => Math.max(1, q - 1))} className={`p-2 rounded-xl ${dm ? 'bg-[#161b22]' : 'bg-white'} shadow`}><MinusCircle className="text-red-400" size={20} /></button>
              <div className="text-center"><p className="text-2xl font-black font-display">{qrQty}</p><p className="text-xs text-slate-400">unidades</p></div>
              <button onClick={() => setQrQty(q => Math.min(scannedProduct.quantity, q + 1))} className={`p-2 rounded-xl ${dm ? 'bg-[#161b22]' : 'bg-white'} shadow`}><PlusCircle className="text-emerald-500" size={20} /></button>
            </div>
            {!qrAction && <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setQrAction('deduct')} className={`${dm ? 'bg-[#0d1117]' : 'bg-slate-50'} rounded-2xl p-4 flex flex-col items-center gap-2 cursor-pointer hover:shadow-md transition-all`}><MinusCircle size={22} className="text-red-500" /><span className="font-bold text-sm">Restar stock</span></button>
              <button onClick={() => setQrAction('service')} className={`${dm ? 'bg-[#0d1117]' : 'bg-slate-50'} rounded-2xl p-4 flex flex-col items-center gap-2 cursor-pointer hover:shadow-md transition-all`}><Car size={22} className="text-blue-500" /><span className="font-bold text-sm">A servicio</span></button>
            </div>}
            {qrAction === 'deduct' && <div className="space-y-3"><p className="text-sm font-bold">Restar <span className="text-red-500">{qrQty}</span> unidad(es)</p><div className="flex gap-2"><button onClick={() => setQrAction(null)} className={`btn-ghost flex-1 ${dm ? 'border-[#30363d] text-slate-300' : 'border-slate-200 text-slate-600'}`}>Volver</button><button onClick={handleQRDeduct} className="btn-primary flex-1" style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)' }}><Check size={16} />Confirmar</button></div></div>}
            {qrAction === 'service' && <div className="space-y-3"><span className="lbl">Servicio activo</span><select className={`inp ${dm ? 'bg-[#0d1117] border-[#30363d] text-white' : 'bg-slate-50 border-slate-200'}`} value={selectedRepairForQR} onChange={e => setSelectedRepairForQR(e.target.value)}><option value="">— Elegí —</option>{repairs.filter(r => r.status !== 'entregado').map(r => <option key={r.id} value={r.id}>{r.vehicle} {r.plate && `· ${r.plate}`}</option>)}</select><div className="flex gap-2"><button onClick={() => setQrAction(null)} className={`btn-ghost flex-1 ${dm ? 'border-[#30363d] text-slate-300' : 'border-slate-200 text-slate-600'}`}>Volver</button><button onClick={handleQRAddToService} disabled={!selectedRepairForQR} className="btn-primary flex-1"><Check size={16} />Agregar</button></div></div>}
          </div>
        </div>
      )}

      {/* SIDEBAR */}
      <nav className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-64 p-5 z-50 transition-colors" style={{ background: dm ? '#010409' : '#0a0f1e', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-xl" style={{ background: 'linear-gradient(135deg,#f97316,#ea580c)' }}><Wrench size={20} className="text-white" /></div>
          <div><h1 className="text-white font-display font-black text-base leading-tight">TallerMaster</h1><p className="text-slate-500 text-xs">{tallerConfig.nombre}</p></div>
        </div>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
          <input className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl text-white placeholder-slate-600 outline-none" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }} placeholder="Buscar todo..." value={globalSearch} onChange={e => setGlobalSearch(e.target.value)} onFocus={() => setView('search')} />
        </div>
        <div className="space-y-0.5 flex-1 overflow-y-auto">
          {[
            { id: 'dashboard', Icon: LayoutDashboard, label: 'Panel' },
            { id: 'list', Icon: Box, label: 'Inventario' },
            { id: 'repairs', Icon: Car, label: 'Servicios' },
            { id: 'budgets', Icon: FileText, label: 'Presupuestos' },
            { id: 'clients', Icon: Users, label: 'Clientes' },
            { id: 'vehicles_list', Icon: Car, label: 'Vehículos' },
            { id: 'history', Icon: Clock, label: 'Historial' },
            { id: 'stock_history', Icon: History, label: 'Mov. Stock' },
            { id: 'stats', Icon: BarChart3, label: 'Estadísticas' },
            { id: 'ai_assistant', Icon: Sparkles, label: 'Asistente IA' },
            { id: 'config', Icon: Settings, label: 'Configuración' },
          ].map(({ id, Icon, label }) => (
            <button key={id} onClick={() => { setView(id); setGlobalSearch(''); }} className={`nav-item ${view === id ? 'active' : ''}`}><Icon size={16} />{label}</button>
          ))}
        </div>
        <div className="flex items-center gap-2 mt-4">
          <button onClick={startQRScan} className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold border" style={{ color: '#f97316', borderColor: 'rgba(249,115,22,0.3)', background: 'rgba(249,115,22,0.05)' }}><QrCode size={15} />QR</button>
          <button onClick={() => setDarkMode(!dm)} className="p-2.5 rounded-xl border" style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'white' }}>{dm ? <Sun size={17} /> : <Moon size={17} />}</button>
        </div>
      </nav>

      <main className="p-4 md:p-6 max-w-4xl mx-auto">
        {/* Notification */}
        {notification && (
          <div className={`fixed bottom-28 md:bottom-6 right-4 ${notification.type === 'error' ? 'bg-red-600' : 'bg-slate-900'} text-white px-5 py-3 rounded-2xl shadow-2xl z-[250] flex items-center gap-3`}>
            {notification.type === 'error' ? <AlertCircle size={17} /> : <Check className="text-orange-400" size={17} />}
            <span className="font-bold text-sm">{notification.msg}</span>
          </div>
        )}

        {/* DASHBOARD */}
        {view === 'dashboard' && (
          <div className="space-y-5 anim">
            <div className="flex justify-between items-center">
              <div><p className={`text-sm ${dm ? 'text-slate-400' : 'text-slate-500'}`}>Bienvenido</p><h2 className="page-title font-display">{tallerConfig.nombre}</h2></div>
              <div className="flex gap-2">
                <button onClick={() => setDarkMode(!dm)} className={`p-2.5 rounded-xl md:hidden border ${dm ? 'border-[#30363d] bg-[#161b22] text-white' : 'border-slate-200 bg-white text-slate-700'}`}>{dm ? <Sun size={17} /> : <Moon size={17} />}</button>
                <button onClick={startQRScan} className={`p-2.5 rounded-xl md:hidden border ${dm ? 'border-[#30363d] bg-[#161b22] text-orange-400' : 'border-orange-200 bg-orange-50 text-orange-500'}`}><QrCode size={17} /></button>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Repuestos', value: inventory.length, from: '#3b82f6', to: '#2563eb', Icon: Package },
                { label: 'Activos', value: repairs.filter(r => r.status !== 'entregado').length, from: '#8b5cf6', to: '#7c3aed', Icon: Car },
                { label: 'Stock bajo', value: inventory.filter(p => p.quantity <= p.minStock).length, from: '#ef4444', to: '#dc2626', Icon: AlertCircle },
                { label: 'Cobrar', value: `$${repairs.filter(r => r.paymentStatus === 'debe').reduce((s, r) => s + (r.totalCost || 0), 0).toLocaleString()}`, from: '#f59e0b', to: '#d97706', Icon: CreditCard },
              ].map(({ label, value, from, to, Icon }) => (
                <div key={label} className="g-card text-white" style={{ background: `linear-gradient(135deg,${from},${to})` }}>
                  <Icon size={18} className="opacity-70 mb-3" /><p className="text-3xl font-display font-black">{value}</p><p className="text-xs font-semibold opacity-70 uppercase tracking-wide mt-1">{label}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[{ label: 'Nuevo Servicio', Icon: Wrench, action: 'add_repair' }, { label: 'Presupuesto', Icon: FileText, action: 'add_budget' }, { label: 'Nuevo Repuesto', Icon: Plus, action: 'add' }].map(({ label, Icon, action }) => (
                <button key={action} onClick={() => setView(action)} className={`card card-hover p-4 text-left w-full border ${dm ? 'bg-[#161b22] border-[#30363d]' : 'bg-white border-white/80'}`}>
                  <div className="p-2.5 rounded-xl mb-3 inline-block" style={{ background: 'linear-gradient(135deg,#fff7ed,#ffedd5)' }}><Icon size={20} className="text-orange-500" /></div>
                  <p className="font-bold text-sm">{label}</p>
                </button>
              ))}
            </div>
            {/* Mini chart */}
            {chartData.some(d => d.total > 0) && (
              <div className={`card border p-5 ${dm ? 'bg-[#161b22] border-[#30363d]' : 'bg-white'}`}>
                <p className="font-display font-bold mb-4">Ingresos — últimos 6 meses</p>
                <div className="flex items-end gap-2 h-28">
                  {chartData.map((d, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <p className="text-xs font-bold text-orange-500">{d.total > 0 ? `$${(d.total / 1000).toFixed(0)}k` : ''}</p>
                      <div className="w-full rounded-t-xl transition-all duration-500" style={{ height: `${(d.total / chartMax) * 80}px`, minHeight: d.total > 0 ? '4px' : '0', background: i === 5 ? 'linear-gradient(180deg,#f97316,#ea580c)' : dm ? '#30363d' : '#e2e8f0' }} />
                      <p className={`text-[10px] font-bold ${dm ? 'text-slate-500' : 'text-slate-400'}`}>{d.month}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {repairs.filter(r => r.status !== 'entregado').length > 0 && (
              <div className={`card border p-5 ${dm ? 'bg-[#161b22] border-[#30363d]' : 'bg-white'}`}>
                <div className="flex justify-between items-center mb-4"><p className="font-display font-bold">Servicios activos</p><button onClick={() => setView('repairs')} className="text-xs text-orange-500 font-bold">Ver todos →</button></div>
                {repairs.filter(r => r.status !== 'entregado').slice(0, 4).map(rep => (
                  <div key={rep.id} className={`flex items-center justify-between py-2.5 border-b last:border-0 ${dm ? 'border-[#30363d]' : 'border-slate-50'}`}>
                    <div>
                      <p className="font-bold text-sm">{rep.vehicle} {rep.plate && <span className="font-mono text-xs text-slate-400">{rep.plate}</span>}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className={`text-xs ${dm ? 'text-slate-400' : 'text-slate-400'}`}>{rep.orderNumber}</p>
                        <PaymentBadge status={rep.paymentStatus || 'debe'} />
                      </div>
                    </div>
                    <StatusPill status={rep.status || 'pendiente'} />
                  </div>
                ))}
              </div>
            )}
            {inventory.filter(p => p.quantity <= p.minStock).length > 0 && (
              <div className={`card border p-5 ${dm ? 'bg-[#161b22] border-red-900/50' : 'bg-white border-red-200'}`} style={{ borderLeft: '4px solid #ef4444' }}>
                <p className="font-bold text-red-500 flex items-center gap-2 text-sm mb-3"><AlertCircle size={15} />Stock bajo</p>
                {inventory.filter(p => p.quantity <= p.minStock).map(p => (
                  <div key={p.id} className={`flex justify-between text-sm py-1.5 border-b last:border-0 ${dm ? 'border-[#30363d]' : 'border-slate-50'}`}><span className="font-medium">{p.name}</span><span className="font-black text-red-500">{p.quantity} un.</span></div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* BÚSQUEDA GLOBAL */}
        {view === 'search' && globalSearch.length > 1 && (
          <div className="space-y-4 anim">
            <h2 className="page-title font-display">"{globalSearch}"</h2>
            {globalResults?.clients.length > 0 && <SearchSection title="Clientes" dm={dm}>{globalResults.clients.map(c => <div key={c.id} className={`py-2 border-b last:border-0 ${dm ? 'border-[#30363d]' : 'border-slate-50'}`}><p className="font-bold text-sm">{c.name}</p><p className="text-xs text-slate-400">{c.phone}</p></div>)}</SearchSection>}
            {globalResults?.repairs.length > 0 && <SearchSection title="Servicios" dm={dm}>{globalResults.repairs.map(r => <div key={r.id} className={`py-2 border-b last:border-0 ${dm ? 'border-[#30363d]' : 'border-slate-50'} flex justify-between items-center`}><div><p className="font-bold text-sm">{r.vehicle} {r.plate}</p><p className="text-xs text-slate-400">{r.clientName}</p></div><StatusPill status={r.status || 'pendiente'} /></div>)}</SearchSection>}
            {globalResults?.vehicles.length > 0 && <SearchSection title="Vehículos" dm={dm}>{globalResults.vehicles.map(v => <div key={v.id} className={`py-2 border-b last:border-0 ${dm ? 'border-[#30363d]' : 'border-slate-50'}`}><p className="font-bold text-sm">🚗 {v.make} {v.model} {v.year} · <span className="font-mono">{v.plate}</span></p><p className="text-xs text-slate-400">{v.clientName}</p></div>)}</SearchSection>}
            {globalResults?.inventory.length > 0 && <SearchSection title="Repuestos" dm={dm}>{globalResults.inventory.map(i => <div key={i.id} className={`py-2 border-b last:border-0 ${dm ? 'border-[#30363d]' : 'border-slate-50'} flex justify-between`}><p className="font-bold text-sm">{i.name}</p><span className={`text-xs font-bold ${i.quantity <= i.minStock ? 'text-red-500' : 'text-emerald-500'}`}>{i.quantity} un.</span></div>)}</SearchSection>}
            {Object.values(globalResults || {}).every(a => a.length === 0) && <div className={`card border p-16 text-center ${dm ? 'bg-[#161b22] border-[#30363d] text-slate-500' : 'bg-white text-slate-400'}`}><Search size={36} className="mx-auto mb-3 opacity-20" /><p>Sin resultados</p></div>}
          </div>
        )}

        {/* INVENTARIO */}
        {view === 'list' && (
          <div className="space-y-4 anim">
            <div className="flex gap-3 justify-between items-center">
              <h2 className="page-title font-display">Inventario</h2>
              <div className="flex gap-2">
                <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} /><input className={`inp pl-9 text-sm ${dm ? 'bg-[#161b22] border-[#30363d] text-white' : 'bg-slate-50 border-slate-200'}`} style={{ width: '170px' }} placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
                <button onClick={() => setView('add')} className="btn-primary" style={{ width: 'auto', padding: '10px 14px' }}><Plus size={15} /></button>
                <button onClick={() => deleteAll('inventory')} className="p-2.5 rounded-xl text-red-400 border" style={{ borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)' }}><Trash2 size={16} /></button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {inventory.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).map(item => (
                <div key={item.id} className={`card card-hover border cursor-pointer ${dm ? 'bg-[#161b22] border-[#30363d]' : 'bg-white'}`}>
                  {item.imageUrl ? <img src={item.imageUrl} alt={item.name} className="w-full h-28 object-cover rounded-t-3xl" /> : <div className={`w-full h-14 rounded-t-3xl flex items-center justify-center ${dm ? 'bg-[#0d1117]' : 'bg-slate-50'}`}><Package size={22} className="text-slate-500 opacity-30" /></div>}
                  <div className="p-4">
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-sm flex-1 pr-2">{item.name}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${item.quantity <= item.minStock ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-700'}`}>{item.quantity} un.</span>
                    </div>
                    <p className={`text-xs mt-1.5 flex items-center gap-1 ${dm ? 'text-slate-500' : 'text-slate-400'}`}><MapPin size={10} />{item.location || 'Sin ubicación'}</p>
                    {item.supplier && <p className={`text-xs mt-0.5 ${dm ? 'text-slate-500' : 'text-slate-400'}`}>🏪 {item.supplier}</p>}
                    <p className="text-lg font-black font-display mt-1">${Number(item.cost).toLocaleString()}</p>
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => { setSelectedProduct(item); setView('details'); }} className={`btn-ghost flex-1 text-xs py-1.5 ${dm ? 'border-[#30363d] text-slate-300' : 'border-slate-200 text-slate-600'}`}><Package size={13} />Ver</button>
                      <button onClick={() => { setEditingProduct({ ...item }); setView('edit_product'); }} className={`btn-ghost flex-1 text-xs py-1.5 ${dm ? 'border-[#30363d] text-slate-300' : 'border-slate-200 text-slate-600'}`}><Edit3 size={13} />Editar</button>
                      <button onClick={() => deleteItem('inventory', item.id, item.name)} className="p-1.5 text-red-400 rounded-xl hover:bg-red-50"><Trash2 size={14} /></button>
                    </div>
                  </div>
                </div>
              ))}
              {inventory.length === 0 && <div className={`col-span-3 card border p-16 text-center ${dm ? 'bg-[#161b22] border-[#30363d] text-slate-500' : 'bg-white text-slate-400'}`}><Package size={40} className="mx-auto mb-3 opacity-20" /><p>Sin repuestos</p></div>}
            </div>
          </div>
        )}

        {/* DETALLE REPUESTO */}
        {view === 'details' && selectedProduct && (
          <div className={`card border overflow-hidden max-w-sm mx-auto anim ${dm ? 'bg-[#161b22] border-[#30363d]' : 'bg-white'}`}>
            <div className="p-6 text-white relative" style={{ background: 'linear-gradient(145deg,#0f172a,#1e293b)' }}>
              <button onClick={() => setView('list')} className="absolute top-4 left-4 p-1.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.08)' }}><ChevronLeft size={18} className="text-white" /></button>
              <button onClick={() => { setEditingProduct({ ...selectedProduct }); setView('edit_product'); }} className="absolute top-4 right-12 p-1.5 rounded-xl text-blue-400" style={{ background: 'rgba(59,130,246,0.15)' }}><Edit3 size={16} /></button>
              <button onClick={() => deleteItem('inventory', selectedProduct.id, selectedProduct.name)} className="absolute top-4 right-4 p-1.5 rounded-xl text-red-400" style={{ background: 'rgba(239,68,68,0.12)' }}><Trash2 size={16} /></button>
              {selectedProduct.imageUrl ? <img src={selectedProduct.imageUrl} alt="" className="w-full h-36 object-contain rounded-2xl mb-4 mt-6" style={{ maxHeight: '144px', objectFit: 'contain' }} /> : <div className="w-full h-14 rounded-2xl mb-4 mt-8 flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.04)' }}><Package size={28} className="text-slate-700" /></div>}
              <h2 className="font-display font-black text-xl uppercase text-center">{selectedProduct.name}</h2>
              <p className="text-orange-400 font-mono text-xs text-center mt-1">{selectedProduct.sku}</p>
              {selectedProduct.description && <p className="text-slate-400 text-xs text-center mt-1">{selectedProduct.description}</p>}
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className={`rounded-2xl p-4 text-center ${dm ? 'bg-[#0d1117]' : 'bg-slate-50'}`}><p className={`text-4xl font-black font-display ${selectedProduct.quantity <= selectedProduct.minStock ? 'text-red-500' : ''}`}>{selectedProduct.quantity}</p><p className="text-xs font-bold text-slate-400 uppercase mt-1">Stock</p></div>
                <div className={`rounded-2xl p-4 text-center ${dm ? 'bg-[#0d1117]' : 'bg-slate-50'}`}><p className="text-2xl font-black font-display">${Number(selectedProduct.cost).toLocaleString()}</p><p className="text-xs font-bold text-slate-400 uppercase mt-1">Costo</p></div>
              </div>
              {selectedProduct.supplier && <div className={`rounded-2xl p-3 text-sm ${dm ? 'bg-[#0d1117]' : 'bg-slate-50'}`}><p className="font-bold">🏪 {selectedProduct.supplier}</p>{selectedProduct.supplierPhone && <p className={`text-xs mt-0.5 ${dm ? 'text-slate-400' : 'text-slate-500'}`}>📞 {selectedProduct.supplierPhone}</p>}</div>}
              <div className={`flex items-center justify-between gap-3 rounded-2xl p-3 ${dm ? 'bg-[#0d1117]' : 'bg-slate-50'}`}>
                <button onClick={() => updateStock(selectedProduct.id, -1)} className={`p-2.5 rounded-xl shadow-sm ${dm ? 'bg-[#161b22]' : 'bg-white'}`}><MinusCircle className="text-red-400" size={20} /></button>
                <span className="font-bold text-sm">Ajustar stock</span>
                <button onClick={() => updateStock(selectedProduct.id, 1)} className={`p-2.5 rounded-xl shadow-sm ${dm ? 'bg-[#161b22]' : 'bg-white'}`}><PlusCircle className="text-emerald-500" size={20} /></button>
              </div>
              <div className="text-center pt-2 border-t" style={{ borderColor: dm ? '#30363d' : '#f1f5f9' }}>
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${selectedProduct.sku}&bgcolor=${dm ? '161b22' : 'ffffff'}&color=${dm ? 'ffffff' : '000000'}`} className="w-28 h-28 mx-auto rounded-2xl border p-1" style={{ borderColor: dm ? '#30363d' : '#e2e8f0' }} alt="QR" />
                <button onClick={() => printQRLabel(selectedProduct)} className={`btn-ghost mt-3 mx-auto ${dm ? 'border-[#30363d] text-slate-300' : 'border-slate-200 text-slate-600'}`} style={{ width: 'auto' }}><Printer size={15} />Imprimir etiqueta</button>
              </div>
            </div>
          </div>
        )}

        {/* SERVICIOS */}
        {view === 'repairs' && (
          <div className="space-y-4 anim">
            <div className="flex justify-between items-center">
              <h2 className="page-title font-display">Servicios</h2>
              <div className="flex gap-2">
                <button onClick={() => setView('add_repair')} className="btn-primary" style={{ width: 'auto', padding: '10px 16px', fontSize: '13px' }}><Plus size={15} />Nuevo</button>
                <button onClick={() => deleteAll('repairs')} className="p-2.5 rounded-xl text-red-400 border" style={{ borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)' }}><Trash2 size={16} /></button>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <span key={key} className={`status-pill ${cfg.tw}`}><span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />{cfg.icon} {cfg.label} ({repairs.filter(r => (r.status || 'pendiente') === key).length})</span>
              ))}
            </div>
            {repairs.sort((a, b) => (b.date?.seconds || 0) - (a.date?.seconds || 0)).map(rep => (
              <div key={rep.id} className={`card border p-5 ${dm ? 'bg-[#161b22] border-[#30363d]' : 'bg-white'}`}>
                {rep.imageUrl && <img src={rep.imageUrl} alt="" className="w-full h-36 object-cover rounded-2xl mb-4" />}
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {rep.orderNumber && <span className="text-xs font-bold text-orange-500 font-mono">{rep.orderNumber}</span>}
                      <h4 className="font-bold">{rep.vehicle}</h4>
                      {rep.plate && <span className={`font-mono text-xs px-2 py-0.5 rounded-lg ${dm ? 'bg-[#0d1117] text-slate-400' : 'bg-slate-100 text-slate-500'}`}>{rep.plate}</span>}
                      <StatusPill status={rep.status || 'pendiente'} />
                    </div>
                    <div className={`flex gap-3 text-xs flex-wrap ${dm ? 'text-slate-400' : 'text-slate-400'}`}>
                      {rep.clientName && <span className="flex items-center gap-1"><Users size={10} />{rep.clientName}</span>}
                      {rep.km && <span>🔢 {Number(rep.km).toLocaleString()} km</span>}
                      {rep.date?.seconds && <span>📅 {new Date(rep.date.seconds * 1000).toLocaleDateString('es-AR')}</span>}
                    </div>
                  </div>
                  <div className="text-right ml-3">
                    <p className="font-black text-emerald-500 text-xl font-display">${rep.totalCost?.toLocaleString()}</p>
                    {rep.laborCost > 0 && <p className="text-xs text-slate-400">MO: ${Number(rep.laborCost).toLocaleString()}</p>}
                  </div>
                </div>
                {rep.description && <p className={`text-sm italic mb-2 ${dm ? 'text-slate-400' : 'text-slate-500'}`}>{rep.description}</p>}
                {rep.notes && <div className={`text-xs rounded-xl p-2.5 mb-3 ${dm ? 'bg-amber-900/20 text-amber-400 border border-amber-900/30' : 'bg-amber-50 text-slate-500 border border-amber-100'}`}>📝 {rep.notes}</div>}
                {rep.partsUsed?.length > 0 && <div className="flex flex-wrap gap-1 mb-3">{rep.partsUsed.map((p, i) => <span key={i} className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${dm ? 'bg-[#0d1117] text-slate-400' : 'bg-slate-100 text-slate-600'}`}>{p.qty}x {p.name}</span>)}</div>}
                {/* Payment + Status controls */}
                <div className={`flex items-center justify-between pt-3 border-t flex-wrap gap-2 ${dm ? 'border-[#30363d]' : 'border-slate-50'}`}>
                  <div className="flex gap-1 flex-wrap">
                    {Object.keys(STATUS_CONFIG).map(s => <button key={s} onClick={() => updateRepairField(rep.id, 'status', s)} className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-all ${(rep.status || 'pendiente') === s ? 'bg-slate-800 text-white' : dm ? 'bg-[#0d1117] text-slate-500 hover:bg-[#30363d]' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>{STATUS_CONFIG[s].icon}</button>)}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {/* Payment buttons */}
                    {Object.entries(PAYMENT_CONFIG).map(([key, cfg]) => (
                      <button key={key} onClick={() => updateRepairField(rep.id, 'paymentStatus', key)} className="text-[10px] font-bold px-2 py-1.5 rounded-lg transition-all" style={{ background: (rep.paymentStatus || 'debe') === key ? cfg.bg : 'transparent', color: cfg.color, border: `1px solid ${(rep.paymentStatus || 'debe') === key ? cfg.color : 'rgba(100,116,139,0.3)' }}` }}>{cfg.icon} {cfg.label}</button>
                    ))}
                    <button onClick={() => { setEditingRepair({ ...rep }); setClientSearch(rep.clientName || ''); setView('edit_repair'); }} className={`flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl ${dm ? 'bg-[#0d1117] text-slate-400' : 'bg-slate-100 text-slate-600'}`}><Edit3 size={12} />Editar</button>
                    {(rep.status === 'listo' || rep.status === 'entregado') && <button onClick={() => openConvertToBudget(rep)} className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl bg-blue-500/10 text-blue-500"><FileText size={12} />Presupuesto</button>}
                    <button onClick={() => deleteItem('repairs', rep.id, `Servicio ${rep.vehicle}`)} className="p-1.5 text-red-400 rounded-xl hover:bg-red-50"><Trash2 size={13} /></button>
                  </div>
                </div>
              </div>
            ))}
            {repairs.length === 0 && <div className={`card border p-16 text-center ${dm ? 'bg-[#161b22] border-[#30363d] text-slate-500' : 'bg-white text-slate-400'}`}><Car size={40} className="mx-auto mb-3 opacity-20" /><p>No hay servicios</p></div>}
          </div>
        )}

        {/* PRESUPUESTOS */}
        {view === 'budgets' && (
          <div className="space-y-4 anim">
            <div className="flex justify-between items-center">
              <h2 className="page-title font-display">Presupuestos</h2>
              <div className="flex gap-2">
                <button onClick={() => { setNewBudget(EMPTY_BUDGET); setClientSearchB(''); setView('add_budget'); }} className="btn-primary" style={{ width: 'auto', padding: '10px 16px', fontSize: '13px' }}><Plus size={15} />Nuevo</button>
                <button onClick={() => deleteAll('budgets')} className="p-2.5 rounded-xl text-red-400 border" style={{ borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)' }}><Trash2 size={16} /></button>
              </div>
            </div>
            {budgets.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)).map(budget => (
              <div key={budget.id} className={`card border p-5 ${dm ? 'bg-[#161b22] border-[#30363d]' : 'bg-white'}`}>
                <div className="flex justify-between items-start">
                  <div><h4 className="font-bold">{budget.clientName}</h4><p className={`text-sm ${dm ? 'text-slate-400' : 'text-slate-500'}`}>{budget.vehicle}{budget.plate && ` · ${budget.plate}`}</p><p className="text-xs text-slate-400 mt-0.5">📅 {budget.date ? new Date(budget.date + 'T12:00:00').toLocaleDateString('es-AR') : '—'}</p></div>
                  <div className="flex flex-col items-end gap-2">
                    <p className="text-xl font-black text-blue-500 font-display">${budget.totalCost?.toLocaleString()}</p>
                    <div className="flex gap-2 flex-wrap justify-end">
                      <button onClick={() => sendWhatsApp(budget)} className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl bg-green-500/10 text-green-500"><MessageCircle size={13} />WhatsApp</button>
                      <button onClick={() => printBudget(budget)} className="btn-dark text-xs py-1.5 px-3"><Printer size={13} />Imprimir</button>
                      <button onClick={() => { setEditingBudget({ ...budget }); setClientSearchB(budget.clientName || ''); setView('edit_budget'); }} className={`btn-ghost text-xs py-1.5 px-3 ${dm ? 'border-[#30363d] text-slate-300' : 'border-slate-200 text-slate-600'}`}><Edit3 size={13} />Editar</button>
                      <button onClick={() => deleteItem('budgets', budget.id, budget.clientName)} className="p-1.5 text-red-400 rounded-xl hover:bg-red-50"><Trash2 size={14} /></button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {budgets.length === 0 && <div className={`card border p-16 text-center ${dm ? 'bg-[#161b22] border-[#30363d] text-slate-500' : 'bg-white text-slate-400'}`}><FileText size={40} className="mx-auto mb-3 opacity-20" /><p>No hay presupuestos</p></div>}
          </div>
        )}

        {/* CLIENTES */}
        {view === 'clients' && (
          <div className="space-y-4 anim">
            <div className="flex justify-between items-center">
              <h2 className="page-title font-display">Clientes</h2>
              <div className="flex gap-2">
                <button onClick={() => setView('add_client')} className="btn-primary" style={{ width: 'auto', padding: '10px 16px', fontSize: '13px' }}><Plus size={15} />Nuevo</button>
                <button onClick={() => deleteAll('clients')} className="p-2.5 rounded-xl text-red-400 border" style={{ borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)' }}><Trash2 size={16} /></button>
              </div>
            </div>
            {clients.map(client => (
              <div key={client.id} className={`card border p-5 ${dm ? 'bg-[#161b22] border-[#30363d]' : 'bg-white'}`}>
                <div className="flex justify-between items-start mb-2">
                  <div><h4 className="font-bold">{client.name}</h4>{client.phone && <p className={`text-sm mt-0.5 ${dm ? 'text-slate-400' : 'text-slate-500'}`}>📞 {client.phone}</p>}{client.email && <p className={`text-xs ${dm ? 'text-slate-500' : 'text-slate-400'}`}>{client.email}</p>}</div>
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingClient({ ...client }); setView('edit_client'); }} className="p-2 text-blue-400 rounded-xl"><Edit3 size={15} /></button>
                    <button onClick={() => deleteItem('clients', client.id, client.name)} className="p-2 text-red-400 rounded-xl"><Trash2 size={15} /></button>
                  </div>
                </div>
                {getClientVehicles(client.id).length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {getClientVehicles(client.id).map(v => (
                      <div key={v.id} className={`rounded-xl px-3 py-2 text-xs border ${dm ? 'bg-[#0d1117] border-[#30363d]' : 'bg-slate-50 border-slate-200'}`}>
                        <p className="font-bold">🚗 {v.make} {v.model} {v.year}</p>
                        {v.plate && <p className={`font-mono mt-0.5 ${dm ? 'text-slate-500' : 'text-slate-400'}`}>{v.plate}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {clients.length === 0 && <div className={`card border p-16 text-center ${dm ? 'bg-[#161b22] border-[#30363d] text-slate-500' : 'bg-white text-slate-400'}`}><Users size={40} className="mx-auto mb-3 opacity-20" /><p>No hay clientes</p></div>}
          </div>
        )}

        {/* VEHÍCULOS */}
        {view === 'vehicles_list' && (
          <div className="space-y-4 anim">
            <div className="flex justify-between items-center">
              <h2 className="page-title font-display">Vehículos</h2>
              <div className="flex gap-2">
                <button onClick={() => setView('add_vehicle')} className="btn-primary" style={{ width: 'auto', padding: '10px 16px', fontSize: '13px' }}><Plus size={15} />Nuevo</button>
                <button onClick={() => deleteAll('vehicles')} className="p-2.5 rounded-xl text-red-400 border" style={{ borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)' }}><Trash2 size={16} /></button>
              </div>
            </div>
            {vehicles.map(v => (
              <div key={v.id} className={`card border p-5 flex justify-between items-start ${dm ? 'bg-[#161b22] border-[#30363d]' : 'bg-white'}`}>
                <div>
                  <p className="font-bold">🚗 {v.make} {v.model} {v.year}</p>
                  {v.plate && <p className={`font-mono text-sm mt-0.5 ${dm ? 'text-slate-400' : 'text-slate-500'}`}>{v.plate}</p>}
                  {v.km && <p className="text-xs text-slate-400">🔢 {Number(v.km).toLocaleString()} km</p>}
                  {v.clientName && <p className="text-xs text-orange-500 font-bold mt-1 flex items-center gap-1"><Users size={10} />{v.clientName}</p>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setEditingVehicle({ ...v }); setView('edit_vehicle'); }} className="p-2 text-blue-400 rounded-xl"><Edit3 size={15} /></button>
                  <button onClick={() => deleteItem('vehicles', v.id, `${v.make} ${v.model}`)} className="p-2 text-red-400 rounded-xl"><Trash2 size={15} /></button>
                </div>
              </div>
            ))}
            {vehicles.length === 0 && <div className={`card border p-16 text-center ${dm ? 'bg-[#161b22] border-[#30363d] text-slate-500' : 'bg-white text-slate-400'}`}><Car size={40} className="mx-auto mb-3 opacity-20" /><p>No hay vehículos</p></div>}
          </div>
        )}

        {/* HISTORIAL */}
        {view === 'history' && (
          <div className="space-y-4 anim">
            <div className="flex justify-between items-center">
              <h2 className="page-title font-display">Historial Vehículo</h2>
              <button onClick={() => deleteAll('repairs')} className="p-2.5 rounded-xl text-red-400 border" style={{ borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)' }}><Trash2 size={16} /></button>
            </div>
            <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} /><input className={`inp pl-9 ${dm ? 'bg-[#161b22] border-[#30363d] text-white' : 'bg-slate-50 border-slate-200'}`} placeholder="Buscar por patente o modelo..." value={vehicleFilter} onChange={e => setVehicleFilter(e.target.value)} /></div>
            {vehicleFilter && vehicleHistory.length === 0 && <div className={`card border p-8 text-center text-sm ${dm ? 'bg-[#161b22] border-[#30363d] text-slate-500' : 'bg-white text-slate-400'}`}>Sin registros para "{vehicleFilter}"</div>}
            {vehicleHistory.sort((a, b) => (b.date?.seconds || 0) - (a.date?.seconds || 0)).map(rep => (
              <div key={rep.id} className={`card border p-5 ${dm ? 'bg-[#161b22] border-[#30363d]' : 'bg-white'}`}>
                <div className="flex justify-between items-start mb-1">
                  <div><h4 className="font-bold">{rep.vehicle} <span className="font-mono text-sm text-slate-400">{rep.plate}</span></h4>
                    <div className={`flex gap-3 text-xs mt-0.5 ${dm ? 'text-slate-500' : 'text-slate-400'}`}>{rep.km && <span>🔢 {Number(rep.km).toLocaleString()} km</span>}{rep.date?.seconds && <span>📅 {new Date(rep.date.seconds * 1000).toLocaleDateString('es-AR')}</span>}</div></div>
                  <p className="font-black text-emerald-500 font-display">${rep.totalCost?.toLocaleString()}</p>
                </div>
                <p className={`text-sm ${dm ? 'text-slate-400' : 'text-slate-600'}`}>{rep.description}</p>
              </div>
            ))}
            {!vehicleFilter && <div className={`card border p-16 text-center ${dm ? 'bg-[#161b22] border-[#30363d] text-slate-500' : 'bg-white text-slate-400'}`}><Clock size={40} className="mx-auto mb-3 opacity-20" /><p className="text-sm">Escribí una patente para ver el historial</p></div>}
          </div>
        )}

        {/* MOVIMIENTOS DE STOCK */}
        {view === 'stock_history' && (
          <div className="space-y-4 anim">
            <div className="flex justify-between items-center">
              <h2 className="page-title font-display">Movimientos de Stock</h2>
              <button onClick={() => deleteAll('stock_history')} className="p-2.5 rounded-xl text-red-400 border" style={{ borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)' }}><Trash2 size={16} /></button>
            </div>
            <div className={`card border overflow-hidden ${dm ? 'bg-[#161b22] border-[#30363d]' : 'bg-white'}`}>
              {stockHistory.sort((a, b) => (b.date?.seconds || 0) - (a.date?.seconds || 0)).slice(0, 50).map((h, i) => (
                <div key={h.id} className={`flex items-center justify-between px-5 py-3 border-b last:border-0 ${dm ? 'border-[#30363d]' : 'border-slate-50'}`}>
                  <div>
                    <p className="font-bold text-sm">{h.productName}</p>
                    <p className={`text-xs ${dm ? 'text-slate-500' : 'text-slate-400'}`}>{h.reason} · {h.date?.seconds ? new Date(h.date.seconds * 1000).toLocaleDateString('es-AR') : '—'}</p>
                  </div>
                  <span className={`font-black text-base font-display ${h.delta > 0 ? 'text-emerald-500' : 'text-red-500'}`}>{h.delta > 0 ? '+' : ''}{h.delta}</span>
                </div>
              ))}
              {stockHistory.length === 0 && <div className={`p-16 text-center ${dm ? 'text-slate-500' : 'text-slate-400'}`}><History size={40} className="mx-auto mb-3 opacity-20" /><p>Sin movimientos</p></div>}
            </div>
          </div>
        )}

        {/* ESTADÍSTICAS */}
        {view === 'stats' && (
          <div className="space-y-5 anim">
            <div className="flex justify-between items-center">
              <h2 className="page-title font-display">Estadísticas</h2>
              <select className={`inp text-sm ${dm ? 'bg-[#161b22] border-[#30363d] text-white' : 'bg-slate-50 border-slate-200'}`} style={{ width: 'auto', padding: '8px 12px' }} value={statsMonth} onChange={e => setStatsMonth(Number(e.target.value))}>
                {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { label: 'Ingresos del mes', value: `$${monthRevenue.toLocaleString()}`, from: '#10b981', to: '#059669', Icon: DollarSign },
                { label: 'Servicios del mes', value: monthRepairs.length, from: '#3b82f6', to: '#2563eb', Icon: Car },
                { label: 'Total repuestos', value: inventory.length, from: '#f97316', to: '#ea580c', Icon: Package },
                { label: 'Valor inventario', value: `$${inventory.reduce((s, p) => s + (p.cost * p.quantity), 0).toLocaleString()}`, from: '#ef4444', to: '#dc2626', Icon: TrendingUp },
                { label: 'Clientes', value: clients.length, from: '#06b6d4', to: '#0891b2', Icon: Users },
                { label: 'Por cobrar', value: `$${repairs.filter(r => r.paymentStatus === 'debe').reduce((s, r) => s + (r.totalCost || 0), 0).toLocaleString()}`, from: '#f59e0b', to: '#d97706', Icon: CreditCard },
              ].map(({ label, value, from, to, Icon }) => (
                <div key={label} className="g-card text-white" style={{ background: `linear-gradient(135deg,${from},${to})` }}>
                  <Icon size={18} className="opacity-70 mb-2" /><p className="text-2xl font-black font-display">{value}</p><p className="text-xs font-semibold opacity-70 uppercase tracking-wide mt-0.5">{label}</p>
                </div>
              ))}
            </div>
            {/* Chart */}
            <div className={`card border p-5 ${dm ? 'bg-[#161b22] border-[#30363d]' : 'bg-white'}`}>
              <p className="font-display font-bold mb-4">Ingresos últimos 6 meses</p>
              <div className="flex items-end gap-2 h-32">
                {chartData.map((d, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    {d.total > 0 && <p className="text-xs font-bold text-orange-500">${(d.total / 1000).toFixed(0)}k</p>}
                    <div className="w-full rounded-t-xl" style={{ height: `${(d.total / chartMax) * 90}px`, minHeight: d.total > 0 ? '4px' : '0', background: i === 5 ? 'linear-gradient(180deg,#f97316,#ea580c)' : dm ? '#21262d' : '#e2e8f0', transition: 'height 0.5s' }} />
                    <p className={`text-[10px] font-bold ${dm ? 'text-slate-500' : 'text-slate-400'}`}>{d.month}</p>
                  </div>
                ))}
              </div>
            </div>
            {/* Top services */}
            {topServices.length > 0 && (
              <div className={`card border p-5 ${dm ? 'bg-[#161b22] border-[#30363d]' : 'bg-white'}`}>
                <p className="font-display font-bold mb-4 flex items-center gap-2"><Award size={16} className="text-orange-500" />Servicios más frecuentes</p>
                {topServices.map(([name, count], i) => (
                  <div key={i} className={`flex items-center gap-3 py-2 border-b last:border-0 ${dm ? 'border-[#30363d]' : 'border-slate-50'}`}>
                    <span className="text-lg font-black text-orange-500 w-6">{i + 1}</span>
                    <span className="flex-1 text-sm font-bold truncate">{name}</span>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${dm ? 'bg-[#0d1117] text-slate-400' : 'bg-slate-100 text-slate-600'}`}>{count}x</span>
                  </div>
                ))}
              </div>
            )}
            {/* Top parts */}
            {topParts.length > 0 && (
              <div className={`card border p-5 ${dm ? 'bg-[#161b22] border-[#30363d]' : 'bg-white'}`}>
                <p className="font-display font-bold mb-4 flex items-center gap-2"><Package size={16} className="text-orange-500" />Repuestos más usados</p>
                {topParts.map(([name, qty], i) => (
                  <div key={i} className={`flex items-center gap-3 py-2 border-b last:border-0 ${dm ? 'border-[#30363d]' : 'border-slate-50'}`}>
                    <span className="text-lg font-black text-blue-500 w-6">{i + 1}</span>
                    <span className="flex-1 text-sm font-bold truncate">{name}</span>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${dm ? 'bg-[#0d1117] text-slate-400' : 'bg-slate-100 text-slate-600'}`}>{qty} un.</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* CONFIGURACIÓN */}
        {view === 'config' && (
          <div className="space-y-5 anim max-w-lg mx-auto">
            <h2 className="page-title font-display">Configuración</h2>
            <div className={`card border p-6 space-y-4 ${dm ? 'bg-[#161b22] border-[#30363d]' : 'bg-white'}`}>
              <p className="font-bold flex items-center gap-2"><Settings size={16} className="text-orange-500" />Datos del taller</p>
              {editConfig ? (
                <>
                  {[['nombre', 'Nombre del taller'], ['direccion', 'Dirección'], ['telefono', 'Teléfono'], ['email', 'Email']].map(([field, label]) => (
                    <div key={field}><span className="lbl">{label}</span><input className={`inp ${dm ? 'bg-[#0d1117] border-[#30363d] text-white' : 'bg-slate-50 border-slate-200'}`} value={editConfig[field] || ''} onChange={e => setEditConfig(c => ({ ...c, [field]: e.target.value }))} /></div>
                  ))}
                  <div className="flex gap-3">
                    <button onClick={() => setEditConfig(null)} className={`btn-ghost flex-1 ${dm ? 'border-[#30363d] text-slate-300' : 'border-slate-200 text-slate-600'}`}>Cancelar</button>
                    <button onClick={saveConfig} className="btn-primary flex-1"><Save size={16} />Guardar</button>
                  </div>
                </>
              ) : (
                <>
                  <div className={`rounded-2xl p-4 space-y-2 ${dm ? 'bg-[#0d1117]' : 'bg-slate-50'}`}>
                    <p className="font-black text-lg">{tallerConfig.nombre}</p>
                    <p className={`text-sm ${dm ? 'text-slate-400' : 'text-slate-500'}`}>📍 {tallerConfig.direccion}</p>
                    <p className={`text-sm ${dm ? 'text-slate-400' : 'text-slate-500'}`}>📞 {tallerConfig.telefono}</p>
                    <p className={`text-sm ${dm ? 'text-slate-400' : 'text-slate-500'}`}>✉️ {tallerConfig.email}</p>
                  </div>
                  <button onClick={() => setEditConfig({ ...tallerConfig })} className="btn-primary"><Edit3 size={16} />Editar datos</button>
                </>
              )}
            </div>
            {/* Dark mode toggle */}
            <div className={`card border p-5 flex justify-between items-center ${dm ? 'bg-[#161b22] border-[#30363d]' : 'bg-white'}`}>
              <div><p className="font-bold">Tema oscuro</p><p className={`text-xs ${dm ? 'text-slate-400' : 'text-slate-500'}`}>Cambia la apariencia de la app</p></div>
              <button onClick={() => setDarkMode(!dm)} className="p-3 rounded-2xl transition-all" style={{ background: dm ? 'rgba(249,115,22,0.15)' : '#f1f5f9', color: dm ? '#f97316' : '#475569' }}>{dm ? <Sun size={22} /> : <Moon size={22} />}</button>
            </div>
            {/* Delete all sections */}
            <div className={`card border p-5 space-y-3 ${dm ? 'bg-[#161b22] border-[#30363d]' : 'bg-white'}`}>
              <p className="font-bold text-red-500 flex items-center gap-2"><Trash2 size={15} />Zona peligrosa — Borrar todo</p>
              <div className="grid grid-cols-2 gap-2">
                {[['repairs', 'Servicios'], ['budgets', 'Presupuestos'], ['inventory', 'Inventario'], ['clients', 'Clientes'], ['vehicles', 'Vehículos'], ['stock_history', 'Mov. Stock']].map(([col, label]) => (
                  <button key={col} onClick={() => deleteAll(col)} className="flex items-center gap-2 p-3 rounded-xl text-sm font-bold text-red-500 border transition-all hover:bg-red-50" style={{ borderColor: 'rgba(239,68,68,0.2)' }}><Trash2 size={14} />Borrar {label}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ASISTENTE IA */}
        {view === 'ai_assistant' && (
          <div className={`card border p-6 space-y-4 max-w-xl mx-auto anim ${dm ? 'bg-[#161b22] border-[#30363d]' : 'bg-white'}`}>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl" style={{ background: 'linear-gradient(135deg,#fbbf24,#f59e0b)' }}><Sparkles size={20} className="text-white" /></div>
              <div><h2 className="font-display font-black text-xl">Asistente IA</h2><p className={`text-xs ${dm ? 'text-slate-400' : 'text-slate-500'}`}>Diagnósticos y consultas técnicas</p></div>
            </div>
            <textarea className={`inp h-36 resize-none ${dm ? 'bg-[#0d1117] border-[#30363d] text-white' : 'bg-slate-50 border-slate-200'}`} placeholder="Ej: Ford Focus 2012, ruido metálico al frenar, vibración en el volante..." value={diagnosisQuery} onChange={e => setDiagnosisQuery(e.target.value)} />
            <button onClick={() => askAI(`Soy mecánico. Problema: ${diagnosisQuery}. Dame diagnóstico probable, qué revisar y repuestos necesarios.`)} disabled={aiLoading || !diagnosisQuery.trim()} className="btn-primary disabled:opacity-50">
              {aiLoading ? <><Loader2 className="animate-spin" size={17} />Analizando...</> : <><Sparkles size={17} />Consultar IA</>}
            </button>
            {aiResponse && <div className={`rounded-2xl p-5 text-sm leading-relaxed whitespace-pre-wrap ${dm ? 'bg-amber-900/15 border border-amber-800/30 text-amber-200' : 'bg-amber-50 border border-amber-200 text-slate-700'}`}><p className="font-bold text-amber-500 mb-2 text-xs uppercase tracking-wide">Diagnóstico</p>{aiResponse}</div>}
          </div>
        )}

        {/* FORMS - Repair & Budget (shared pattern) */}
        {(view === 'add_repair' || view === 'edit_repair') && (
          <RepairForm
            isEdit={view === 'edit_repair'}
            data={view === 'edit_repair' ? editingRepair : newRepair}
            setData={view === 'edit_repair' ? setEditingRepair : setNewRepair}
            onSubmit={view === 'edit_repair' ? updateRepair : saveRepair}
            onCancel={() => { setView('repairs'); setClientSearch(''); setEditingRepair(null); }}
            clients={clients} getClientVehicles={getClientVehicles}
            clientSearch={clientSearch} setClientSearch={setClientSearch}
            showDD={showClientDD} setShowDD={setShowClientDD}
            onSelectClient={c => selectClient(c, view === 'edit_repair' ? 'editRepair' : 'repair')}
            onSelectVehicle={v => selectVehicle(v, view === 'edit_repair' ? setEditingRepair : setNewRepair)}
            inventory={inventory} dm={dm} startCamera={startCamera}
            cameraTarget={view === 'edit_repair' ? 'editRepair' : 'repair'}
          />
        )}

        {(view === 'add_budget' || view === 'edit_budget') && (
          <BudgetForm
            isEdit={view === 'edit_budget'}
            data={view === 'edit_budget' ? editingBudget : newBudget}
            setData={view === 'edit_budget' ? setEditingBudget : setNewBudget}
            onSubmit={view === 'edit_budget' ? updateBudget : saveBudget}
            onCancel={() => { setView('budgets'); setClientSearchB(''); setEditingBudget(null); }}
            clients={clients} getClientVehicles={getClientVehicles}
            clientSearch={clientSearchB} setClientSearch={setClientSearchB}
            showDD={showClientDDB} setShowDD={setShowClientDDB}
            onSelectClient={c => selectClient(c, view === 'edit_budget' ? 'editBudget' : 'budget')}
            onSelectVehicle={v => selectVehicle(v, view === 'edit_budget' ? setEditingBudget : setNewBudget)}
            inventory={inventory} dm={dm} prefilled={view === 'add_budget' && newBudget.vehicle !== ''}
          />
        )}

        {(view === 'add' || view === 'edit_product') && (
          <ProductForm
            isEdit={view === 'edit_product'}
            data={view === 'edit_product' ? editingProduct : newProduct}
            setData={view === 'edit_product' ? setEditingProduct : setNewProduct}
            onSubmit={view === 'edit_product' ? updateProduct : saveProduct}
            onCancel={() => setView('list')}
            dm={dm} startCamera={target => startCamera(view === 'edit_product' ? 'editProduct' : target)}
          />
        )}

        {(view === 'add_client' || view === 'edit_client') && (
          <ClientForm
            isEdit={view === 'edit_client'}
            data={view === 'edit_client' ? editingClient : newClient}
            setData={view === 'edit_client' ? setEditingClient : setNewClient}
            onSubmit={view === 'edit_client' ? updateClient : saveClient}
            onCancel={() => { setView('clients'); setEditingClient(null); }}
            tempVehicle={tempVehicle} setTempVehicle={setTempVehicle} dm={dm}
          />
        )}

        {(view === 'add_vehicle' || view === 'edit_vehicle') && (
          <VehicleForm
            isEdit={view === 'edit_vehicle'}
            data={view === 'edit_vehicle' ? editingVehicle : newVehicleForm}
            setData={view === 'edit_vehicle' ? setEditingVehicle : setNewVehicleForm}
            onSubmit={view === 'edit_vehicle' ? updateVehicle : saveVehicle}
            onCancel={() => { setView('vehicles_list'); setEditingVehicle(null); }}
            clients={clients} dm={dm}
          />
        )}

        {/* QR SCAN */}
        {view === 'scan' && (
          <div className="fixed inset-0 z-[100] flex flex-col" style={{ background: '#000' }}>
            <div className="flex items-center justify-between p-5">
              <button onClick={() => setView('dashboard')} className="p-3 rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }}><X size={22} className="text-white" /></button>
              <p className="text-white font-bold">Escanear repuesto</p>
              <div style={{ width: 48 }} />
            </div>
            <div className="flex-1 relative flex items-center justify-center">
              <div id="qr-reader" className="w-full max-w-xs" />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative w-64 h-64">
                  {[['top-0 left-0 border-t-4 border-l-4 rounded-tl-2xl'], ['top-0 right-0 border-t-4 border-r-4 rounded-tr-2xl'], ['bottom-0 left-0 border-b-4 border-l-4 rounded-bl-2xl'], ['bottom-0 right-0 border-b-4 border-r-4 rounded-br-2xl']].map(([cls], i) => (
                    <div key={i} className={`absolute w-10 h-10 border-orange-500 ${cls}`} />
                  ))}
                </div>
              </div>
            </div>
            <p className="text-white text-center pb-10 font-bold pulse2">Apuntá al código QR</p>
          </div>
        )}

        {/* CAMERA */}
        {view === 'camera' && (
          <div className="fixed inset-0 z-[100] flex flex-col" style={{ background: '#000' }}>
            <div className="flex items-center justify-between p-5 absolute top-0 left-0 right-0 z-10">
              <button onClick={() => { confirmPhoto(); setCapturedPhoto(null); setView(cameraTarget === 'product' || cameraTarget === 'editProduct' ? (cameraTarget === 'product' ? 'add' : 'edit_product') : cameraTarget === 'editRepair' ? 'edit_repair' : 'add_repair'); setCapturedPhoto(null); }} className="p-3 rounded-full" style={{ background: 'rgba(0,0,0,0.5)' }}><X size={22} className="text-white" /></button>
              <p className="text-white font-bold text-sm">{capturedPhoto ? 'Revisar' : 'Tomar foto'}</p>
              {capturedPhoto ? <button onClick={() => setCapturedPhoto(null)} className="p-3 rounded-full" style={{ background: 'rgba(0,0,0,0.5)' }}><RefreshCw size={18} className="text-white" /></button> : <div style={{ width: 48 }} />}
            </div>
            <div className="flex-1 relative overflow-hidden flex items-center justify-center" style={{ background: '#000' }}>
              <video ref={videoRef} autoPlay playsInline muted className="w-full object-cover" style={{ display: capturedPhoto ? 'none' : 'block', maxHeight: '70vh' }} />
              {capturedPhoto && <div className="flex items-center justify-center w-full h-full"><img src={capturedPhoto} className="object-contain rounded-2xl" style={{ maxHeight: '70vh', maxWidth: '100%' }} alt="preview" /></div>}
              {!capturedPhoto && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><div className="w-72 h-72 rounded-3xl border-2 border-white opacity-25" /></div>}
            </div>
            <div className="p-8 flex items-center justify-center gap-8" style={{ background: 'rgba(0,0,0,0.7)' }}>
              {!capturedPhoto ? (
                <button onClick={capturePhoto} className="shutter-btn" disabled={!cameraReady}><div className="shutter-inner" /></button>
              ) : (
                <>
                  <button onClick={() => setCapturedPhoto(null)} className="flex flex-col items-center gap-2 text-white"><div className="p-4 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }}><RefreshCw size={22} /></div><span className="text-xs font-bold">Repetir</span></button>
                  <button onClick={confirmPhoto} className="flex flex-col items-center gap-2 text-white"><div className="p-4 rounded-full" style={{ background: 'linear-gradient(135deg,#f97316,#ea580c)' }}><Check size={22} /></div><span className="text-xs font-bold">Usar</span></button>
                </>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Mobile nav */}
      <nav className={`md:hidden fixed bottom-0 left-0 right-0 px-2 py-2 flex justify-around items-center z-50 transition-colors ${dm ? 'bg-[#161b22]' : 'bg-white'}`} style={{ boxShadow: '0 -1px 0 rgba(0,0,0,0.1),0 -8px 24px rgba(0,0,0,0.06)' }}>
        {[
          { id: 'dashboard', Icon: LayoutDashboard, label: 'Panel' },
          { id: 'list', Icon: Box, label: 'Stock' },
          { id: 'scan', Icon: QrCode, label: 'Scan', primary: true },
          { id: 'repairs', Icon: Car, label: 'Servicios' },
          { id: 'budgets', Icon: FileText, label: 'Presupuestos' },
        ].map(({ id, Icon, label, primary }) => (
          <button key={id} onClick={() => id === 'scan' ? startQRScan() : setView(id)} className={`flex flex-col items-center gap-0.5 px-2 ${primary ? '' : view === id ? 'text-orange-500' : dm ? 'text-slate-500' : 'text-slate-400'}`} style={primary ? { marginTop: '-20px' } : {}}>
            {primary ? <div className="p-3.5 rounded-full border-4 shadow-lg" style={{ background: 'linear-gradient(135deg,#f97316,#ea580c)', borderColor: dm ? '#161b22' : 'white' }}><Icon size={20} className="text-white" /></div> : <Icon size={20} />}
            <span className={`text-[9px] font-bold ${primary ? 'text-orange-500' : ''}`}>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────

function StatusPill({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pendiente;
  return <span className={`status-pill ${cfg.tw}`}><span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />{cfg.icon} {cfg.label}</span>;
}

function PaymentBadge({ status }) {
  const cfg = PAYMENT_CONFIG[status] || PAYMENT_CONFIG.debe;
  return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: cfg.bg, color: cfg.color }}>{cfg.icon} {cfg.label}</span>;
}

function SearchSection({ title, children, dm }) {
  return (
    <div className={`card border p-5 ${dm ? 'bg-[#161b22] border-[#30363d]' : 'bg-white'}`}>
      <p className="lbl mb-3">{title}</p>{children}
    </div>
  );
}

function FormCard({ children, title, onCancel, dm }) {
  return (
    <form className={`card border p-6 space-y-4 max-w-xl mx-auto anim ${dm ? 'bg-[#161b22] border-[#30363d]' : 'bg-white'}`} onSubmit={e => e.preventDefault()}>
      <div className="flex items-center gap-3">
        <button type="button" onClick={onCancel} className={`p-2 rounded-xl ${dm ? 'bg-[#0d1117]' : 'bg-slate-100'}`}><ChevronLeft size={18} /></button>
        <h2 className="font-display font-black text-xl">{title}</h2>
      </div>
      {children}
    </form>
  );
}

function Inp({ label, dm, ...props }) {
  return (
    <div>
      {label && <span className="lbl">{label}</span>}
      <input className={`inp ${dm ? 'bg-[#0d1117] border-[#30363d] text-white placeholder-slate-600' : 'bg-slate-50 border-slate-200'}`} {...props} />
    </div>
  );
}

function TA({ label, dm, ...props }) {
  return (
    <div>
      {label && <span className="lbl">{label}</span>}
      <textarea className={`inp h-20 resize-none ${dm ? 'bg-[#0d1117] border-[#30363d] text-white placeholder-slate-600' : 'bg-slate-50 border-slate-200'}`} {...props} />
    </div>
  );
}

function ClientDropdown({ clientSearch, setClientSearch, showDD, setShowDD, clients, onSelect, dm }) {
  return (
    <div className="relative">
      <span className="lbl">Cliente</span>
      <div className="relative">
        <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
        <input className={`inp pl-9 ${dm ? 'bg-[#0d1117] border-[#30363d] text-white placeholder-slate-600' : 'bg-slate-50 border-slate-200'}`} placeholder="Buscar cliente..." value={clientSearch} onChange={e => { setClientSearch(e.target.value); setShowDD(true); }} onFocus={() => setShowDD(true)} />
      </div>
      {showDD && clientSearch && (
        <div className={`absolute z-30 w-full rounded-2xl shadow-2xl mt-1 max-h-40 overflow-y-auto border ${dm ? 'bg-[#161b22] border-[#30363d]' : 'bg-white border-slate-200'}`}>
          {clients.filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase())).map(c => (
            <div key={c.id} onClick={() => onSelect(c)} className={`p-3 cursor-pointer border-b last:border-0 ${dm ? 'hover:bg-[#0d1117] border-[#30363d]' : 'hover:bg-orange-50 border-slate-50'}`}>
              <p className="font-bold text-sm">{c.name}</p><p className="text-xs text-slate-400">{c.phone}</p>
            </div>
          ))}
          {clients.filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase())).length === 0 && <p className="p-3 text-slate-400 text-sm text-center">No encontrado</p>}
        </div>
      )}
    </div>
  );
}

function VehicleSelector({ clientId, currentPlate, onSelect, getClientVehicles, dm }) {
  const vList = getClientVehicles(clientId);
  if (!clientId || vList.length === 0) return null;
  return (
    <div>
      <span className="lbl">Vehículos del cliente</span>
      <div className="flex gap-2 flex-wrap">
        {vList.map((v, i) => (
          <button key={i} type="button" onClick={() => onSelect(v)} className={`px-3 py-2 rounded-xl text-xs font-bold border-2 transition-all ${currentPlate === v.plate ? 'border-orange-500 bg-orange-50 text-orange-700' : dm ? 'border-[#30363d] bg-[#0d1117] text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
            🚗 {v.make} {v.model} · <span className="font-mono">{v.plate}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function PartSelector({ inventory, parts, onChange, dm }) {
  const [search, setSearch] = useState('');
  return (
    <div className="space-y-2">
      <span className="lbl">Repuestos</span>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
        <input className={`inp pl-9 text-sm ${dm ? 'bg-[#0d1117] border-[#30363d] text-white placeholder-slate-600' : 'bg-slate-50 border-slate-200'}`} placeholder="Buscar repuesto..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      {search && (
        <div className={`rounded-2xl overflow-hidden shadow-2xl max-h-36 overflow-y-auto border ${dm ? 'bg-[#161b22] border-[#30363d]' : 'bg-white border-slate-200'}`}>
          {inventory.filter(i => i.name.toLowerCase().includes(search.toLowerCase()) && i.quantity > 0 && !parts.find(p => p.id === i.id)).map(i => (
            <div key={i.id} onClick={() => { onChange([...parts, { id: i.id, name: i.name, qty: 1, cost: i.cost }]); setSearch(''); }} className={`p-3 cursor-pointer text-sm flex justify-between border-b last:border-0 ${dm ? 'hover:bg-[#0d1117] border-[#30363d]' : 'hover:bg-orange-50 border-slate-50'}`}>
              <span className="font-bold">{i.name}</span><span className="text-slate-400 text-xs">Stock: {i.quantity}</span>
            </div>
          ))}
          {inventory.filter(i => i.name.toLowerCase().includes(search.toLowerCase())).length === 0 && <p className="p-3 text-slate-400 text-sm text-center">No encontrado</p>}
        </div>
      )}
      {parts.length > 0 && (
        <div className="space-y-1.5">
          {parts.map((p, idx) => (
            <div key={idx} className={`flex items-center gap-2 rounded-xl px-3 py-2.5 border ${dm ? 'bg-[#0d1117] border-[#30363d]' : 'bg-slate-50 border-slate-200'}`}>
              <span className="text-sm font-bold flex-1">{p.name}</span>
              <input type="number" min="1" value={p.qty} onChange={e => { const np = [...parts]; np[idx].qty = Number(e.target.value); onChange(np); }} className={`inp text-center text-sm py-1 px-2 ${dm ? 'bg-[#161b22] border-[#30363d] text-white' : 'bg-white border-slate-200'}`} style={{ width: '3.5rem' }} />
              <span className="text-xs font-bold text-slate-400 w-20 text-right">${(p.cost * p.qty).toLocaleString()}</span>
              <button type="button" onClick={() => onChange(parts.filter((_, i) => i !== idx))} className="text-red-400 p-1"><X size={14} /></button>
            </div>
          ))}
          <div className={`text-right text-xs font-bold pr-2 ${dm ? 'text-slate-500' : 'text-slate-400'}`}>Subtotal: ${parts.reduce((s, p) => s + (p.cost * p.qty), 0).toLocaleString()}</div>
        </div>
      )}
    </div>
  );
}

function TotalBox({ parts, laborCost, dm, color = 'green' }) {
  const total = (parts || []).reduce((s, p) => s + (p.cost * p.qty), 0) + Number(laborCost || 0);
  if (total <= 0) return null;
  const styles = { green: { bg: '#f0fdf4', border: '#bbf7d0', color: '#166534' }, blue: { bg: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8' } };
  const s = styles[color];
  return <div className="rounded-2xl p-4 text-sm font-bold" style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color }}>💰 Total: ${total.toLocaleString()}</div>;
}

function RepairForm({ isEdit, data, setData, onSubmit, onCancel, clients, getClientVehicles, clientSearch, setClientSearch, showDD, setShowDD, onSelectClient, onSelectVehicle, inventory, dm, startCamera }) {
  if (!data) return null;
  return (
    <form onSubmit={onSubmit} className={`card border p-6 space-y-4 max-w-xl mx-auto anim ${dm ? 'bg-[#161b22] border-[#30363d]' : 'bg-white'}`}>
      <div className="flex items-center gap-3">
        <button type="button" onClick={onCancel} className={`p-2 rounded-xl ${dm ? 'bg-[#0d1117]' : 'bg-slate-100'}`}><ChevronLeft size={18} /></button>
        <h2 className="font-display font-black text-xl">{isEdit ? 'Editar Servicio' : 'Nuevo Servicio'}</h2>
      </div>
      <ClientDropdown clientSearch={clientSearch} setClientSearch={setClientSearch} showDD={showDD} setShowDD={setShowDD} clients={clients} onSelect={onSelectClient} dm={dm} />
      <VehicleSelector clientId={data.clientId} currentPlate={data.plate} onSelect={onSelectVehicle} getClientVehicles={getClientVehicles} dm={dm} />
      <div className="grid grid-cols-2 gap-3">
        <Inp label="Vehículo *" required placeholder="Toyota Corolla" value={data.vehicle || ''} onChange={e => setData(f => ({ ...f, vehicle: e.target.value }))} dm={dm} />
        <Inp label="Patente" placeholder="ABC123" className={`inp uppercase font-mono ${dm ? 'bg-[#0d1117] border-[#30363d] text-white' : 'bg-slate-50 border-slate-200'}`} value={data.plate || ''} onChange={e => setData(f => ({ ...f, plate: e.target.value.toUpperCase() }))} dm={dm} />
        <Inp label="Kilometraje" type="number" placeholder="75000" value={data.km || ''} onChange={e => setData(f => ({ ...f, km: e.target.value }))} dm={dm} />
        <Inp label="Mano de obra $" type="number" min="0" value={data.laborCost || 0} onChange={e => setData(f => ({ ...f, laborCost: e.target.value }))} dm={dm} />
      </div>
      <div>
        <span className="lbl">Estado</span>
        <div className="flex gap-2 flex-wrap">
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => <button key={key} type="button" onClick={() => setData(f => ({ ...f, status: key }))} className={`status-pill cursor-pointer border-2 transition-all ${data.status === key ? 'border-orange-500 ring-2 ring-orange-200' : 'border-transparent'} ${cfg.tw}`}>{cfg.icon} {cfg.label}</button>)}
        </div>
      </div>
      <div>
        <span className="lbl">Estado de pago</span>
        <div className="flex gap-2 flex-wrap">
          {Object.entries(PAYMENT_CONFIG).map(([key, cfg]) => <button key={key} type="button" onClick={() => setData(f => ({ ...f, paymentStatus: key }))} className="text-xs font-bold px-3 py-2 rounded-xl border-2 transition-all" style={{ color: cfg.color, background: (data.paymentStatus || 'debe') === key ? cfg.bg : 'transparent', borderColor: (data.paymentStatus || 'debe') === key ? cfg.color : 'rgba(100,116,139,0.3)' }}>{cfg.icon} {cfg.label}</button>)}
        </div>
      </div>
      <TA label="Descripción" placeholder="Trabajo realizado..." value={data.description || ''} onChange={e => setData(f => ({ ...f, description: e.target.value }))} dm={dm} />
      <Inp label="Notas internas" placeholder="Observaciones..." value={data.notes || ''} onChange={e => setData(f => ({ ...f, notes: e.target.value }))} dm={dm} />
      <div>
        <span className="lbl">Foto del vehículo</span>
        <div className="flex gap-2">
          <button type="button" onClick={() => startCamera(isEdit ? 'editRepair' : 'repair')} className={`btn-ghost flex-1 ${dm ? 'border-[#30363d] text-slate-300' : 'border-slate-200 text-slate-600'}`}><Camera size={15} />Tomar foto</button>
          {data.imageUrl && <div className="relative"><img src={data.imageUrl} className="h-12 w-16 object-cover rounded-xl" alt="" /><button type="button" onClick={() => setData(f => ({ ...f, imageUrl: '' }))} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5"><X size={10} /></button></div>}
        </div>
      </div>
      <PartSelector inventory={inventory} parts={data.partsUsed || []} onChange={parts => setData(f => ({ ...f, partsUsed: parts }))} dm={dm} />
      <TotalBox parts={data.partsUsed} laborCost={data.laborCost} dm={dm} color="green" />
      <button type="submit" className="btn-primary"><Check size={17} />{isEdit ? 'Guardar cambios' : 'Finalizar Servicio'}</button>
    </form>
  );
}

function BudgetForm({ isEdit, data, setData, onSubmit, onCancel, clients, getClientVehicles, clientSearch, setClientSearch, showDD, setShowDD, onSelectClient, onSelectVehicle, inventory, dm, prefilled }) {
  if (!data) return null;
  return (
    <form onSubmit={onSubmit} className={`card border p-6 space-y-4 max-w-xl mx-auto anim ${dm ? 'bg-[#161b22] border-[#30363d]' : 'bg-white'}`}>
      <div className="flex items-center gap-3">
        <button type="button" onClick={onCancel} className={`p-2 rounded-xl ${dm ? 'bg-[#0d1117]' : 'bg-slate-100'}`}><ChevronLeft size={18} /></button>
        <h2 className="font-display font-black text-xl">{isEdit ? 'Editar Presupuesto' : 'Nuevo Presupuesto'}</h2>
        {prefilled && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-lg font-bold">Datos precargados</span>}
      </div>
      <Inp label="Fecha" type="date" value={data.date || ''} onChange={e => setData(f => ({ ...f, date: e.target.value }))} dm={dm} />
      <ClientDropdown clientSearch={clientSearch} setClientSearch={setClientSearch} showDD={showDD} setShowDD={setShowDD} clients={clients} onSelect={onSelectClient} dm={dm} />
      <Inp label="Teléfono cliente" placeholder="11-1234-5678" value={data.clientPhone || ''} onChange={e => setData(f => ({ ...f, clientPhone: e.target.value }))} dm={dm} />
      <VehicleSelector clientId={data.clientId} currentPlate={data.plate} onSelect={onSelectVehicle} getClientVehicles={getClientVehicles} dm={dm} />
      <div className="grid grid-cols-2 gap-3">
        <Inp label="Vehículo *" required placeholder="Ford Ka 2018" value={data.vehicle || ''} onChange={e => setData(f => ({ ...f, vehicle: e.target.value }))} dm={dm} />
        <Inp label="Patente" placeholder="ABC123" value={data.plate || ''} onChange={e => setData(f => ({ ...f, plate: e.target.value.toUpperCase() }))} dm={dm} />
        <Inp label="Kilometraje" type="number" placeholder="75000" value={data.km || ''} onChange={e => setData(f => ({ ...f, km: e.target.value }))} dm={dm} />
        <Inp label="Mano de obra $" type="number" min="0" value={data.laborCost || 0} onChange={e => setData(f => ({ ...f, laborCost: e.target.value }))} dm={dm} />
      </div>
      <TA label="Descripción del trabajo" placeholder="Qué se va a realizar..." value={data.description || ''} onChange={e => setData(f => ({ ...f, description: e.target.value }))} dm={dm} />
      <PartSelector inventory={inventory} parts={data.partsUsed || []} onChange={parts => setData(f => ({ ...f, partsUsed: parts }))} dm={dm} />
      <TA label="Notas" placeholder="Condiciones, garantía..." value={data.notes || ''} onChange={e => setData(f => ({ ...f, notes: e.target.value }))} dm={dm} />
      <TotalBox parts={data.partsUsed} laborCost={data.laborCost} dm={dm} color="blue" />
      <button type="submit" className="btn-primary"><Save size={17} />{isEdit ? 'Guardar cambios' : 'Guardar Presupuesto'}</button>
    </form>
  );
}

function ProductForm({ isEdit, data, setData, onSubmit, onCancel, dm, startCamera }) {
  if (!data) return null;
  return (
    <form onSubmit={onSubmit} className={`card border p-6 space-y-4 max-w-md mx-auto anim ${dm ? 'bg-[#161b22] border-[#30363d]' : 'bg-white'}`}>
      <div className="flex items-center gap-3">
        <button type="button" onClick={onCancel} className={`p-2 rounded-xl ${dm ? 'bg-[#0d1117]' : 'bg-slate-100'}`}><ChevronLeft size={18} /></button>
        <h2 className="font-display font-black text-xl">{isEdit ? 'Editar Repuesto' : 'Nuevo Repuesto'}</h2>
      </div>
      <Inp label="Nombre *" required placeholder="Filtro de aceite" value={data.name || ''} onChange={e => setData(f => ({ ...f, name: e.target.value }))} dm={dm} />
      <Inp label="Descripción" placeholder="Marca, modelo compatible..." value={data.description || ''} onChange={e => setData(f => ({ ...f, description: e.target.value }))} dm={dm} />
      <Inp label="Ubicación" placeholder="Estante A, Cajón 2" value={data.location || ''} onChange={e => setData(f => ({ ...f, location: e.target.value }))} dm={dm} />
      <div className="grid grid-cols-2 gap-3">
        <Inp label="Proveedor" placeholder="Distribuidora X" value={data.supplier || ''} onChange={e => setData(f => ({ ...f, supplier: e.target.value }))} dm={dm} />
        <Inp label="Tel. proveedor" placeholder="11-xxxx-xxxx" value={data.supplierPhone || ''} onChange={e => setData(f => ({ ...f, supplierPhone: e.target.value }))} dm={dm} />
      </div>
      <div>
        <span className="lbl">Foto</span>
        <div className="flex gap-2 items-center">
          <button type="button" onClick={() => startCamera('product')} className={`btn-ghost flex-1 ${dm ? 'border-[#30363d] text-slate-300' : 'border-slate-200 text-slate-600'}`}><Camera size={15} />Tomar foto</button>
          <input className={`inp text-xs flex-1 ${dm ? 'bg-[#0d1117] border-[#30363d] text-white' : 'bg-slate-50 border-slate-200'}`} placeholder="O pegar URL..." value={data.imageUrl || ''} onChange={e => setData(f => ({ ...f, imageUrl: e.target.value }))} />
        </div>
        {data.imageUrl && <img src={data.imageUrl} alt="" className="w-24 h-24 object-cover rounded-2xl mt-2" />}
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Inp label="Costo $" type="number" min="0" value={data.cost || 0} onChange={e => setData(f => ({ ...f, cost: e.target.value }))} dm={dm} />
        <Inp label="Stock" type="number" min="0" value={data.quantity || 0} onChange={e => setData(f => ({ ...f, quantity: e.target.value }))} dm={dm} />
        <Inp label="Mínimo" type="number" min="0" value={data.minStock || 1} onChange={e => setData(f => ({ ...f, minStock: e.target.value }))} dm={dm} />
      </div>
      <button type="submit" className="btn-primary"><Save size={17} />{isEdit ? 'Guardar cambios' : 'Guardar Repuesto'}</button>
    </form>
  );
}

function ClientForm({ isEdit, data, setData, onSubmit, onCancel, tempVehicle, setTempVehicle, dm }) {
  if (!data) return null;
  return (
    <form onSubmit={onSubmit} className={`card border p-6 space-y-4 max-w-lg mx-auto anim ${dm ? 'bg-[#161b22] border-[#30363d]' : 'bg-white'}`}>
      <div className="flex items-center gap-3">
        <button type="button" onClick={onCancel} className={`p-2 rounded-xl ${dm ? 'bg-[#0d1117]' : 'bg-slate-100'}`}><ChevronLeft size={18} /></button>
        <h2 className="font-display font-black text-xl">{isEdit ? 'Editar Cliente' : 'Nuevo Cliente'}</h2>
      </div>
      <Inp label="Nombre *" required placeholder="Juan García" value={data.name || ''} onChange={e => setData(f => ({ ...f, name: e.target.value }))} dm={dm} />
      <div className="grid grid-cols-2 gap-3">
        <Inp label="Teléfono" placeholder="11-1234-5678" value={data.phone || ''} onChange={e => setData(f => ({ ...f, phone: e.target.value }))} dm={dm} />
        <Inp label="Email" type="email" placeholder="juan@email.com" value={data.email || ''} onChange={e => setData(f => ({ ...f, email: e.target.value }))} dm={dm} />
      </div>
      {!isEdit && (
        <div className={`rounded-2xl p-4 space-y-3`} style={{ background: dm ? '#0d1117' : '#f8fafc', border: `1.5px dashed ${dm ? '#30363d' : '#e2e8f0'}` }}>
          <p className="font-bold text-sm flex items-center gap-2"><Car size={14} className="text-orange-500" />Agregar vehículos (opcional)</p>
          <div className="grid grid-cols-3 gap-2">
            {[['make', 'Marca', 'Toyota'], ['model', 'Modelo', 'Corolla'], ['year', 'Año', '2018'], ['plate', 'Patente', 'ABC123'], ['km', 'KM', '75000']].map(([field, label, placeholder]) => (
              <div key={field}><span className="lbl">{label}</span><input className={`inp text-sm ${field === 'plate' ? 'uppercase font-mono' : ''} ${dm ? 'bg-[#161b22] border-[#30363d] text-white' : 'bg-white border-slate-200'}`} placeholder={placeholder} value={tempVehicle[field] || ''} onChange={e => setTempVehicle(t => ({ ...t, [field]: e.target.value }))} /></div>
            ))}
            <div className="flex items-end"><button type="button" onClick={() => { if (tempVehicle.make) { setData(c => ({ ...c, vehicles: [...(c.vehicles || []), { ...tempVehicle }] })); setTempVehicle({ make: '', model: '', year: '', plate: '', km: '' }); } }} className="btn-dark w-full"><Plus size={14} />Add</button></div>
          </div>
          {(data.vehicles || []).map((v, i) => (
            <div key={i} className={`flex items-center justify-between rounded-xl px-3 py-2 ${dm ? 'bg-[#161b22]' : 'bg-white'} shadow-sm`}>
              <p className="text-sm font-bold">🚗 {v.make} {v.model} · <span className="font-mono">{v.plate}</span></p>
              <button type="button" onClick={() => setData(c => ({ ...c, vehicles: c.vehicles.filter((_, j) => j !== i) }))} className="text-red-400"><X size={14} /></button>
            </div>
          ))}
        </div>
      )}
      <button type="submit" className="btn-primary"><Save size={17} />{isEdit ? 'Guardar cambios' : 'Guardar Cliente'}</button>
    </form>
  );
}

function VehicleForm({ isEdit, data, setData, onSubmit, onCancel, clients, dm }) {
  if (!data) return null;
  return (
    <form onSubmit={onSubmit} className={`card border p-6 space-y-4 max-w-md mx-auto anim ${dm ? 'bg-[#161b22] border-[#30363d]' : 'bg-white'}`}>
      <div className="flex items-center gap-3">
        <button type="button" onClick={onCancel} className={`p-2 rounded-xl ${dm ? 'bg-[#0d1117]' : 'bg-slate-100'}`}><ChevronLeft size={18} /></button>
        <h2 className="font-display font-black text-xl">{isEdit ? 'Editar Vehículo' : 'Nuevo Vehículo'}</h2>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Inp label="Marca *" required placeholder="Toyota" value={data.make || ''} onChange={e => setData(f => ({ ...f, make: e.target.value }))} dm={dm} />
        <Inp label="Modelo *" required placeholder="Corolla" value={data.model || ''} onChange={e => setData(f => ({ ...f, model: e.target.value }))} dm={dm} />
        <Inp label="Año" placeholder="2018" value={data.year || ''} onChange={e => setData(f => ({ ...f, year: e.target.value }))} dm={dm} />
        <Inp label="Patente" placeholder="ABC123" value={data.plate || ''} onChange={e => setData(f => ({ ...f, plate: e.target.value.toUpperCase() }))} dm={dm} />
        <Inp label="Kilometraje" type="number" placeholder="75000" value={data.km || ''} onChange={e => setData(f => ({ ...f, km: e.target.value }))} dm={dm} />
      </div>
      <div>
        <span className="lbl">Vincular a cliente</span>
        <select className={`inp ${dm ? 'bg-[#0d1117] border-[#30363d] text-white' : 'bg-slate-50 border-slate-200'}`} value={data.clientId || ''} onChange={e => { const c = clients.find(c => c.id === e.target.value); setData(f => ({ ...f, clientId: e.target.value, clientName: c?.name || '' })); }}>
          <option value="">— Sin cliente —</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <button type="submit" className="btn-primary"><Save size={17} />{isEdit ? 'Guardar cambios' : 'Guardar Vehículo'}</button>
    </form>
  );
}
