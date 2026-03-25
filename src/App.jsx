import React, { useState, useEffect, useCallback, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getFirestore, collection, doc, onSnapshot, updateDoc,
  deleteDoc, query, addDoc, serverTimestamp, writeBatch, getDocs, setDoc
} from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import {
  Plus, Search, MapPin, MinusCircle, PlusCircle, Camera, Trash2, X,
  ChevronLeft, LayoutDashboard, Box, Check, Sparkles, Wrench, Car,
  DollarSign, Save, Printer, Loader2, AlertCircle, Users, FileText,
  Clock, TrendingUp, BarChart3, RefreshCw, QrCode, Edit3, Package,
  MessageCircle, Settings, Moon, Sun, History, AlertTriangle,
  CreditCard, Award, LogOut, User, Lock, Eye, EyeOff, Building2,
  ChevronDown, Shield, LayoutList, LayoutGrid
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
  pendiente: { label:'Pendiente', tw:'bg-amber-50 text-amber-700 border-amber-200', dot:'bg-amber-400', icon:'⏳' },
  en_proceso: { label:'En proceso', tw:'bg-blue-50 text-blue-700 border-blue-200', dot:'bg-blue-500', icon:'🔧' },
  listo: { label:'Listo', tw:'bg-emerald-50 text-emerald-700 border-emerald-200', dot:'bg-emerald-500', icon:'✅' },
  entregado: { label:'Entregado', tw:'bg-slate-100 text-slate-500 border-slate-200', dot:'bg-slate-400', icon:'📦' },
};
const PAYMENT_CONFIG = {
  debe: { label:'Debe', color:'#ef4444', bg:'rgba(239,68,68,0.15)', icon:'❌' },
  señado: { label:'Señado', color:'#f59e0b', bg:'rgba(245,158,11,0.15)', icon:'⚡' },
  pagado: { label:'Pagado', color:'#10b981', bg:'rgba(16,185,129,0.15)', icon:'✅' },
};

const DEFAULT_CONFIG = {
  nombre:'Taller CheCk', direccion:'Tu dirección', telefono:'3329677336', email:'tu@email.com',
  empresas: [
    { id:'1', nombre:'Empresa Principal', cuit:'20-12345678-9', direccion:'Tu dirección', telefono:'3329677336', email:'tu@email.com' },
    { id:'2', nombre:'Empresa Secundaria', cuit:'20-98765432-1', direccion:'Tu dirección 2', telefono:'3329677336', email:'tu2@email.com' },
  ]
};

const DEFAULT_USERS = [{ id:'1', name:'Francisco', username:'francisco', password:'taller123', role:'admin', color:'#f97316' }];

const EMPTY_REPAIR = { vehicle:'', plate:'', km:'', clientId:'', clientName:'', description:'', partsUsed:[], laborCost:0, status:'pendiente', paymentStatus:'debe', imageUrl:'', notes:'', orderNumber:'', payments:[] };
const EMPTY_BUDGET = { clientId:'', clientName:'', clientPhone:'', vehicle:'', plate:'', km:'', description:'', partsUsed:[], laborCost:0, notes:'', date:new Date().toISOString().split('T')[0], empresaId:'1', budgetNumber:'' };
const EMPTY_CLIENT = { name:'', phone:'', email:'', vehicles:[] };
const EMPTY_VEHICLE = { make:'', model:'', year:'', plate:'', km:'', clientId:'', clientName:'' };
const EMPTY_PRODUCT = { name:'', sku:'', barcode:'', location:'', quantity:0, minStock:1, cost:0, salePrice:0, imageUrl:'', description:'', supplier:'', supplierPhone:'', categoryId:'' };


function CatSelect({data, setData, categories, dm}) {
  const [adding, setAdding] = React.useState(false);
  const [newName, setNewName] = React.useState('');
  const saveNewCat = async () => {
    if (!newName.trim()) return;
    const ref = await addDoc(collection(db,'artifacts',appId,'public','data','categories'), {name:newName.trim(), createdAt:serverTimestamp()});
    setData(f=>({...f, categoryId:ref.id}));
    setNewName(''); setAdding(false);
  };
  return (
    <div>
      <span className="lbl">Categoría</span>
      <div className="flex gap-2">
        <select className={`inp flex-1 ${dm?'bg-[#0d1117] border-[#30363d] text-white':'bg-slate-50 border-slate-200'}`} value={data.categoryId||''} onChange={e=>setData(f=>({...f,categoryId:e.target.value}))}>
          <option value="">— Sin categoría —</option>
          {categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button type="button" onClick={()=>setAdding(!adding)} className={`px-3 rounded-xl border-2 font-bold text-orange-500 transition-colors ${dm?'border-[#30363d] hover:bg-[#0d1117]':'border-slate-200 hover:bg-orange-50'}`}><Plus size={16}/></button>
      </div>
      {adding&&(
        <div className="flex gap-2 mt-2">
          <input autoFocus className={`inp flex-1 text-sm ${dm?'bg-[#0d1117] border-[#30363d] text-white':'bg-slate-50 border-slate-200'}`} placeholder="Nombre de la categoría..." value={newName} onChange={e=>setNewName(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();saveNewCat();}if(e.key==='Escape')setAdding(false);}}/>
          <button type="button" onClick={saveNewCat} className="btn-primary" style={{width:'auto',padding:'8px 14px'}}><Check size={14}/></button>
        </div>
      )}
    </div>
  );
}

function ViewToggle({mode, setMode, dm}) {
  return (
    <div style={{display:'flex',background:'rgba(255,255,255,0.05)',borderRadius:'12px',padding:'3px',gap:'2px'}}>
      <button onClick={()=>{setMode('list');localStorage.setItem('tm_listmode','list');}} style={{padding:'6px 10px',borderRadius:'9px',border:'none',cursor:'pointer',background:mode==='list'?'#f97316':'transparent',color:mode==='list'?'white':'#6b7280',transition:'all 0.2s',display:'flex',alignItems:'center'}}><LayoutList size={15}/></button>
      <button onClick={()=>{setMode('grid');localStorage.setItem('tm_listmode','grid');}} style={{padding:'6px 10px',borderRadius:'9px',border:'none',cursor:'pointer',background:mode==='grid'?'#f97316':'transparent',color:mode==='grid'?'white':'#6b7280',transition:'all 0.2s',display:'flex',alignItems:'center'}}><LayoutGrid size={15}/></button>
    </div>
  );
}

export default function App() {
  // Auth state
  const [currentUser, setCurrentUser] = useState(() => {
    try { const s=localStorage.getItem('tm_session'); return s?JSON.parse(s):null; } catch { return null; }
  });
  const [loginForm, setLoginForm] = useState({ username:'', password:'' });
  const [rememberMe, setRememberMe] = useState(true);
  const [loginError, setLoginError] = useState('');
  const [showPw, setShowPw] = useState(false);

  // Config
  const [tallerConfig, setTallerConfig] = useState(DEFAULT_CONFIG);
  const [tallerUsers, setTallerUsers] = useState(DEFAULT_USERS);
  const [darkMode, setDarkMode] = useState(true); // Always dark mode
  const [orderCounter, setOrderCounter] = useState(0);
  const [budgetCounter, setBudgetCounter] = useState(0);
  const [configLoaded, setConfigLoaded] = useState(false);

  // Firebase
  const [user, setUser] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [repairs, setRepairs] = useState([]);
  const [clients, setClients] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [stockHistory, setStockHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // UI
  const [view, setView] = useState('dashboard');
  const [listMode, setListMode] = useState(() => localStorage.getItem('tm_listmode') || 'list');
  const [invFilter, setInvFilter] = useState({ category:'', stock:'', search:'' });
  const [categories, setCategories] = useState([]);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(null); // repair id
  const [paymentAmount, setPaymentAmount] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [globalSearch, setGlobalSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [notification, setNotification] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(null);
  const [statsMonth, setStatsMonth] = useState(new Date().getMonth());
  const [vehicleFilter, setVehicleFilter] = useState('');

  // Camera
  const videoRef = useRef(null);
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraTarget, setCameraTarget] = useState(null);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);

  // QR
  const [scannedProduct, setScannedProduct] = useState(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [scannedNewBarcode, setScannedNewBarcode] = useState(null);
  const [showNewBarcodeModal, setShowNewBarcodeModal] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const qrInstanceRef = useRef(null);
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
  const [tempVehicle, setTempVehicle] = useState({ make:'', model:'', year:'', plate:'', km:'' });
  const [clientSearch, setClientSearch] = useState('');
  const [clientSearchB, setClientSearchB] = useState('');
  const [showClientDD, setShowClientDD] = useState(false);
  const [showClientDDB, setShowClientDDB] = useState(false);

  // Config editing
  const [editConfig, setEditConfig] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [newUserForm, setNewUserForm] = useState({ name:'', username:'', password:'', role:'empleado', color:'#3b82f6' });
  const [showAddUser, setShowAddUser] = useState(false);

  const showNotif = useCallback((msg, type='success') => { setNotification({msg,type}); setTimeout(()=>setNotification(null),3500); }, []);

  const playBeep = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'square';
      osc.frequency.setValueAtTime(1800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
    } catch {}
  }, []);

  useEffect(() => { document.documentElement.classList.add('dark'); }, []);
  useEffect(() => { signInAnonymously(auth).catch(console.error); return onAuthStateChanged(auth, u=>{setUser(u);setLoading(false);}); }, []);

  useEffect(() => {
    if (!user) return;
    const cols = [
      { name:'inventory', setter:setInventory, extra:(items)=>setSelectedProduct(p=>p?items.find(i=>i.id===p.id)||p:null) },
      { name:'repairs', setter:setRepairs },
      { name:'clients', setter:setClients },
      { name:'budgets', setter:setBudgets },
      { name:'vehicles', setter:setVehicles },
      { name:'stock_history', setter:setStockHistory },
      { name:'categories', setter:setCategories },
    ];
    const unsubs = cols.map(({name,setter,extra})=>{
      const ref = collection(db,'artifacts',appId,'public','data',name);
      return onSnapshot(query(ref),snap=>{
        const items = snap.docs.map(d=>({id:d.id,...d.data()}));
        setter(items); if(extra) extra(items);
      },console.error);
    });

    // Load config, users, orderCounter from Firebase (single doc)
    const configRef = doc(db,'artifacts',appId,'public','appconfig');
    const unsubConfig = onSnapshot(configRef, snap => {
      if (snap.exists()) {
        const d = snap.data();
        if (d.tallerConfig) setTallerConfig(d.tallerConfig);
        if (d.tallerUsers) setTallerUsers(d.tallerUsers);
        if (d.orderCounter !== undefined) setOrderCounter(d.orderCounter);
        if (d.budgetCounter !== undefined) setBudgetCounter(d.budgetCounter);
      }
      setConfigLoaded(true);
    }, () => setConfigLoaded(true));

    return ()=>{ unsubs.forEach(u=>u()); unsubConfig(); };
  }, [user]);

  // Login — checks Firebase users, falls back to DEFAULT_USERS
  const handleLogin = () => {
    const allUsers = tallerUsers.length > 0 ? tallerUsers : DEFAULT_USERS;
    const u = allUsers.find(u=>u.username.toLowerCase()===loginForm.username.toLowerCase().trim()&&u.password===loginForm.password.trim());
    if (u) {
      setCurrentUser(u);
      if (rememberMe) localStorage.setItem('tm_session', JSON.stringify(u));
      else localStorage.removeItem('tm_session');
      setLoginError('');
    } else setLoginError('Usuario o contraseña incorrectos');
  };
  const handleLogout = () => { setCurrentUser(null); localStorage.removeItem('tm_session'); };

  // Camera
  const startCamera = async target => {
    setCameraTarget(target); setCapturedPhoto(null); setCameraReady(false);
    try { const s = await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}}); setCameraStream(s); setView('camera'); }
    catch { showNotif("Sin acceso a cámara","error"); }
  };
  useEffect(() => {
    if (view==='camera'&&cameraStream&&videoRef.current) { videoRef.current.srcObject=cameraStream; videoRef.current.onloadedmetadata=()=>setCameraReady(true); }
    if (view!=='camera'&&cameraStream) { cameraStream.getTracks().forEach(t=>t.stop()); setCameraStream(null); setCameraReady(false); }
  },[view,cameraStream]);
  const capturePhoto = () => {
    if (!videoRef.current||!cameraReady) return;
    const c=document.createElement('canvas'); c.width=videoRef.current.videoWidth; c.height=videoRef.current.videoHeight;
    c.getContext('2d').drawImage(videoRef.current,0,0); setCapturedPhoto(c.toDataURL('image/jpeg',0.82));
  };
  const confirmPhoto = () => {
    const targets = {product:['newProduct',setNewProduct,'add'], editProduct:['editingProduct',setEditingProduct,'edit_product'], repair:['newRepair',setNewRepair,'add_repair'], editRepair:['editingRepair',setEditingRepair,'edit_repair']};
    if (cameraTarget==='product') setNewProduct(p=>({...p,imageUrl:capturedPhoto}));
    if (cameraTarget==='editProduct') setEditingProduct(p=>({...p,imageUrl:capturedPhoto}));
    if (cameraTarget==='repair') setNewRepair(r=>({...r,imageUrl:capturedPhoto}));
    if (cameraTarget==='editRepair') setEditingRepair(r=>({...r,imageUrl:capturedPhoto}));
    const back={product:'add',editProduct:'edit_product',repair:'add_repair',editRepair:'edit_repair'};
    setView(back[cameraTarget]||'dashboard'); setCapturedPhoto(null);
  };

  // QR
  const startQRScan = () => {
    if (!document.getElementById('qr-sc')) { const s=document.createElement('script'); s.id='qr-sc'; s.src="https://unpkg.com/html5-qrcode"; s.async=true; document.body.appendChild(s); }
    setView('scan');
  };
  useEffect(() => {
    let qr=null;
    if (view==='scan') {
      const go=async()=>{
        if (!window.Html5Qrcode){setTimeout(go,500);return;}
        try {
          qr=new window.Html5Qrcode("qr-reader");
          qrInstanceRef.current = qr;
          const formats = [
            window.Html5QrcodeSupportedFormats?.QR_CODE,
            window.Html5QrcodeSupportedFormats?.EAN_13,
            window.Html5QrcodeSupportedFormats?.EAN_8,
            window.Html5QrcodeSupportedFormats?.CODE_128,
            window.Html5QrcodeSupportedFormats?.CODE_39,
            window.Html5QrcodeSupportedFormats?.UPC_A,
            window.Html5QrcodeSupportedFormats?.UPC_E,
          ].filter(Boolean);
          await qr.start({facingMode:"environment"},{fps:30,qrbox:{width:250,height:150},formatsToSupport:formats.length>0?formats:undefined,aspectRatio:1.5,videoConstraints:{facingMode:"environment",width:{ideal:1280},height:{ideal:720}}},
            text=>{
              const found=inventory.find(p=>p.sku===text||p.id===text||p.barcode===text);
              playBeep();
              if (found){
                setScannedProduct(found);setQrQty(1);setSelectedRepairForQR('');setQrAction(null);setShowQRModal(true);
                setView('dashboard'); qr.stop().catch(()=>{});
              } else {
                // Not in inventory — open new product form with barcode pre-filled
                setView('dashboard'); qr.stop().catch(()=>{});
                setNewProduct({...EMPTY_PRODUCT, sku:text, barcode:text});
                showNotif('Código nuevo — completá los datos del repuesto');
                setView('add');
              }
            },()=>{});
        } catch { setView('dashboard'); }
      };
      setTimeout(go,800);
    }
    return ()=>{if(qr?.isScanning)qr.stop().catch(()=>{});}; 
  },[view,inventory,showNotif]);

  // Budget number
  const nextBudgetNumber = async () => {
    const n = budgetCounter + 1;
    setBudgetCounter(n);
    try { await updateDoc(doc(db,'artifacts',appId,'public','appconfig'), {budgetCounter: n}); }
    catch { try { await setDoc(doc(db,'artifacts',appId,'public','appconfig'), {budgetCounter:n}, {merge:true}); } catch{} }
    return String(n).padStart(4,'0');
  };

  // Order — counter saved in Firebase
  const nextOrder = async () => {
    const n = orderCounter + 1;
    setOrderCounter(n);
    try { await updateDoc(doc(db,'artifacts',appId,'public','appconfig'), {orderCounter: n}); }
    catch { try { await setDoc(doc(db,'artifacts',appId,'public','appconfig'), {orderCounter:n}, {merge:true}); } catch{} }
    return `ORD-${String(n).padStart(4,'0')}`;
  };

  // Categories
  const saveCategory = async () => {
    if (!newCategoryName.trim()) return;
    await addDoc(collection(db,'artifacts',appId,'public','data','categories'), { name:newCategoryName.trim(), createdAt:serverTimestamp() });
    setNewCategoryName(''); setShowAddCategory(false); showNotif('✓ Categoría creada');
  };
  const deleteCategory = async id => {
    await deleteDoc(doc(db,'artifacts',appId,'public','data','categories',id));
    showNotif('Categoría eliminada');
  };

  // Partial payments
  const addPayment = async (repairId) => {
    const amount = Number(paymentAmount);
    if (!amount || amount <= 0) { showNotif('Ingresá un monto válido','error'); return; }
    const repair = repairs.find(r=>r.id===repairId);
    if (!repair) return;
    const payments = [...(repair.payments||[]), { amount, date: new Date().toISOString(), user: currentUser?.name }];
    const totalPaid = payments.reduce((s,p)=>s+p.amount,0);
    const newPayStatus = totalPaid >= (repair.totalCost||0) ? 'pagado' : totalPaid > 0 ? 'señado' : 'debe';
    await updateDoc(doc(db,'artifacts',appId,'public','data','repairs',repairId), { payments, paymentStatus: newPayStatus });
    setPaymentAmount(''); setShowPaymentModal(null); showNotif('✓ Pago registrado');
  };

  // Stock log
  const logStock = async (productId,productName,delta,reason) => {
    await addDoc(collection(db,'artifacts',appId,'public','data','stock_history'),{productId,productName,delta,reason,date:serverTimestamp(),user:currentUser?.name||'Sistema'});
  };

  // Inline client+vehicle creation from repair form
  const createClientAndVehicle = async (clientData, vehicleData, setRepairData) => {
    try {
      const clientRef = await addDoc(collection(db,'artifacts',appId,'public','data','clients'), {
        name: clientData.name, phone: clientData.phone||'', email: clientData.email||'',
        createdAt: serverTimestamp(), createdBy: currentUser?.name
      });
      const clientId = clientRef.id;
      // Save vehicle if make is filled
      if (vehicleData.make) {
        await addDoc(collection(db,'artifacts',appId,'public','data','vehicles'), {
          ...vehicleData, clientId, clientName: clientData.name, createdAt: serverTimestamp()
        });
      }
      // Auto-fill repair form with new client+vehicle
      setRepairData(f => ({
        ...f,
        clientId,
        clientName: clientData.name,
        vehicle: vehicleData.make ? `${vehicleData.make} ${vehicleData.model} ${vehicleData.year}`.trim() : f.vehicle,
        plate: vehicleData.plate || f.plate,
        km: vehicleData.km || f.km,
      }));
      setClientSearch(clientData.name);
      showNotif(`✓ Cliente "${clientData.name}" creado y vinculado`);
    } catch(err) { showNotif("Error al crear cliente: " + err.message, "error"); }
  };

  // Client helpers
  const getClientVehicles = id => vehicles.filter(v=>v.clientId===id);
  const selectClient = (client,target) => {
    if (target==='repair') setNewRepair(r=>({...r,clientId:client.id,clientName:client.name}));
    if (target==='editRepair') setEditingRepair(r=>({...r,clientId:client.id,clientName:client.name}));
    if (target==='budget') setNewBudget(b=>({...b,clientId:client.id,clientName:client.name,clientPhone:client.phone||''}));
    if (target==='editBudget') setEditingBudget(b=>({...b,clientId:client.id,clientName:client.name,clientPhone:client.phone||''}));
    if (target.includes('epair')){setClientSearch(client.name);setShowClientDD(false);}
    else {setClientSearchB(client.name);setShowClientDDB(false);}
  };
  const selectVehicle = (v,setter) => {
    const vStr=`${v.make||''} ${v.model||''} ${v.year||''}`.trim();
    // Get last km from repair history for this vehicle
    const lastRepairWithKm = [...repairs].filter(r=>r.plate===v.plate&&r.km).sort((a,b)=>(b.date?.seconds||0)-(a.date?.seconds||0));
    const lastKm = lastRepairWithKm.length>0 ? lastRepairWithKm[0].km : (v.km||'');
    setter(f=>({...f,vehicle:vStr,plate:v.plate||'',km:lastKm}));
  };

  // AI
  const askAI = async prompt => {
    setAiLoading(true); setAiResponse('');
    try {
      const res = await fetch('https://tallercito-ai.francicheuade.workers.dev/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
      const data = await res.json();
      if (!data.text) throw new Error();
      setAiResponse(data.text);
    } catch { setAiResponse("⚠️ La IA no responde. Intentá de nuevo en unos segundos."); }
    finally { setAiLoading(false); }
  };
  const [aiLoading,setAiLoading]=useState(false);
  const [aiResponse,setAiResponse]=useState('');
  const [diagnosisQuery,setDiagnosisQuery]=useState('');

  // Delete
  const deleteItem = (col,id,label) => setConfirmDelete({col,id,label});
  const confirmDeleteItem = async () => {
    if (!confirmDelete) return;
    await deleteDoc(doc(db,'artifacts',appId,'public','data',confirmDelete.col,confirmDelete.id));
    showNotif("Eliminado"); setConfirmDelete(null);
    if (view==='details'||view==='edit_product') setView('list');
  };
  const deleteAll = col => setConfirmDeleteAll(col);
  const confirmDeleteAllItems = async () => {
    if (!confirmDeleteAll) return;
    const snap=await getDocs(collection(db,'artifacts',appId,'public','data',confirmDeleteAll));
    const batch=writeBatch(db); snap.docs.forEach(d=>batch.delete(d.ref)); await batch.commit();
    showNotif("Todo eliminado"); setConfirmDeleteAll(null);
  };

  // CRUD Products
  const saveProduct = async e => {
    e.preventDefault();
    const sku=newProduct.sku||`REP-${Math.random().toString(36).substr(2,6).toUpperCase()}`;
    try {
      const ref=await addDoc(collection(db,'artifacts',appId,'public','data','inventory'),{...newProduct,sku,quantity:Number(newProduct.quantity),cost:Number(newProduct.cost),minStock:Number(newProduct.minStock),createdAt:serverTimestamp(),createdBy:currentUser?.name});
      await logStock(ref.id,newProduct.name,Number(newProduct.quantity),'Stock inicial');
      setNewProduct(EMPTY_PRODUCT); setView('list'); showNotif("✓ Repuesto guardado");
    } catch { showNotif("Error","error"); }
  };
  const updateProduct = async e => {
    e.preventDefault();
    try {
      const orig=inventory.find(i=>i.id===editingProduct.id);
      const delta=Number(editingProduct.quantity)-(orig?.quantity||0);
      await updateDoc(doc(db,'artifacts',appId,'public','data','inventory',editingProduct.id),{...editingProduct,quantity:Number(editingProduct.quantity),cost:Number(editingProduct.cost),minStock:Number(editingProduct.minStock),updatedBy:currentUser?.name});
      if (delta!==0) await logStock(editingProduct.id,editingProduct.name,delta,'Ajuste manual');
      setEditingProduct(null); setView('list'); showNotif("✓ Actualizado");
    } catch { showNotif("Error","error"); }
  };

  // CRUD Repairs
  const saveRepair = async e => {
    e.preventDefault();
    try {
      const orderNum = await nextOrder();
      const batch = writeBatch(db);
      const ref = doc(collection(db,'artifacts',appId,'public','data','repairs'));
      const partsCost = (newRepair.partsUsed||[]).reduce((s,p)=>s+(p.cost*p.qty),0);
      const total = partsCost + Number(newRepair.laborCost||0);
      // Clean data - remove undefined values that Firestore rejects
      const repairData = {
        vehicle: newRepair.vehicle||'',
        plate: newRepair.plate||'',
        km: newRepair.km||'',
        clientId: newRepair.clientId||'',
        clientName: newRepair.clientName||'',
        description: newRepair.description||'',
        notes: newRepair.notes||'',
        imageUrl: newRepair.imageUrl||'',
        partsUsed: newRepair.partsUsed||[],
        laborCost: Number(newRepair.laborCost||0),
        status: newRepair.status||'pendiente',
        paymentStatus: newRepair.paymentStatus||'debe',
        payments: [],
        orderNumber: orderNum,
        date: serverTimestamp(),
        totalCost: total,
        partsCost,
        createdBy: currentUser?.name||'',
      };
      batch.set(ref, repairData);
      (newRepair.partsUsed||[]).forEach(part=>{
        const orig = inventory.find(i=>i.id===part.id);
        if(orig) batch.update(doc(db,'artifacts',appId,'public','data','inventory',part.id),{quantity:Math.max(0,orig.quantity-part.qty)});
      });
      await batch.commit();
      for(const part of (newRepair.partsUsed||[])) await logStock(part.id,part.name,-part.qty,`Servicio ${orderNum}`);
      setNewRepair(EMPTY_REPAIR); setClientSearch(''); setView('repairs'); showNotif(`✓ ${orderNum} creado`);
    } catch(err) {
      console.error('saveRepair error:', err);
      showNotif(`Error al guardar: ${err.message}`,'error');
    }
  };
  const updateRepair = async e => {
    e.preventDefault();
    try {
      const partsCost=(editingRepair.partsUsed||[]).reduce((s,p)=>s+(p.cost*p.qty),0);
      const total=partsCost+Number(editingRepair.laborCost||0);
      await updateDoc(doc(db,'artifacts',appId,'public','data','repairs',editingRepair.id),{
        ...editingRepair,
        totalCost:total,
        partsCost,
        laborCost:Number(editingRepair.laborCost||0),
        updatedBy:currentUser?.name||''
      });
      setEditingRepair(null); setClientSearch(''); setView('repairs'); showNotif("✓ Actualizado");
    } catch(err) { showNotif(`Error: ${err.message}`,"error"); }
  };
  const updateRepairField = async (id,field,value) => { await updateDoc(doc(db,'artifacts',appId,'public','data','repairs',id),{[field]:value}); };

  // CRUD Budgets
  const saveBudget = async e => {
    e.preventDefault();
    const partsCost=newBudget.partsUsed.reduce((s,p)=>s+(p.cost*p.qty),0);
    const total=partsCost+Number(newBudget.laborCost);
    try {
      await addDoc(collection(db,'artifacts',appId,'public','data','budgets'),{...newBudget,createdAt:serverTimestamp(),totalCost:total,partsCost,laborCost:Number(newBudget.laborCost),createdBy:currentUser?.name});
      setNewBudget(EMPTY_BUDGET); setClientSearchB(''); setView('budgets'); showNotif("✓ Presupuesto guardado");
    } catch { showNotif("Error","error"); }
  };
  const updateBudget = async e => {
    e.preventDefault();
    const partsCost=editingBudget.partsUsed.reduce((s,p)=>s+(p.cost*p.qty),0);
    const total=partsCost+Number(editingBudget.laborCost);
    try {
      await updateDoc(doc(db,'artifacts',appId,'public','data','budgets',editingBudget.id),{...editingBudget,totalCost:total,partsCost,laborCost:Number(editingBudget.laborCost),updatedBy:currentUser?.name});
      setEditingBudget(null); setClientSearchB(''); setView('budgets'); showNotif("✓ Actualizado");
    } catch { showNotif("Error","error"); }
  };
  const openConvertToBudget = repair => {
    setNewBudget({clientId:repair.clientId||'',clientName:repair.clientName||'',clientPhone:'',vehicle:repair.vehicle||'',plate:repair.plate||'',km:repair.km||'',description:repair.description||'',partsUsed:repair.partsUsed||[],laborCost:repair.laborCost||0,notes:repair.notes||'',date:new Date().toISOString().split('T')[0],empresaId:'1'});
    setClientSearchB(repair.clientName||''); setView('add_budget'); showNotif("Datos cargados — revisá antes de guardar");
  };

  // CRUD Clients — FIX: also create vehicles in separate collection
  const saveClient = async e => {
    e.preventDefault();
    try {
      const clientRef=await addDoc(collection(db,'artifacts',appId,'public','data','clients'),{name:newClient.name,phone:newClient.phone,email:newClient.email,createdAt:serverTimestamp(),createdBy:currentUser?.name});
      // Save each vehicle to the vehicles collection linked to this client
      for (const v of (newClient.vehicles||[])) {
        await addDoc(collection(db,'artifacts',appId,'public','data','vehicles'),{...v,clientId:clientRef.id,clientName:newClient.name,createdAt:serverTimestamp()});
      }
      setNewClient(EMPTY_CLIENT); setTempVehicle({make:'',model:'',year:'',plate:'',km:''});
      setView('clients'); showNotif("✓ Cliente guardado");
    } catch { showNotif("Error","error"); }
  };
  const updateClient = async e => {
    e.preventDefault();
    try {
      await updateDoc(doc(db,'artifacts',appId,'public','data','clients',editingClient.id),{name:editingClient.name,phone:editingClient.phone,email:editingClient.email,updatedBy:currentUser?.name});
      // Update clientName in linked vehicles
      const clientVehicles=vehicles.filter(v=>v.clientId===editingClient.id);
      for (const v of clientVehicles) await updateDoc(doc(db,'artifacts',appId,'public','data','vehicles',v.id),{clientName:editingClient.name});
      setEditingClient(null); setView('clients'); showNotif("✓ Cliente actualizado");
    } catch { showNotif("Error","error"); }
  };

  // CRUD Vehicles
  const saveVehicle = async e => {
    e.preventDefault();
    try {
      await addDoc(collection(db,'artifacts',appId,'public','data','vehicles'),{...newVehicleForm,createdAt:serverTimestamp()});
      setNewVehicleForm(EMPTY_VEHICLE); setView('vehicles_list'); showNotif("✓ Vehículo guardado");
    } catch { showNotif("Error","error"); }
  };
  const updateVehicle = async e => {
    e.preventDefault();
    try {
      await updateDoc(doc(db,'artifacts',appId,'public','data','vehicles',editingVehicle.id),{...editingVehicle});
      setEditingVehicle(null); setView('vehicles_list'); showNotif("✓ Actualizado");
    } catch { showNotif("Error","error"); }
  };

  // Stock
  const updateStock = async (id,delta,reason='Ajuste manual') => {
    const item=inventory.find(i=>i.id===id); if(!item) return;
    await updateDoc(doc(db,'artifacts',appId,'public','data','inventory',id),{quantity:Math.max(0,item.quantity+delta)});
    await logStock(id,item.name,delta,reason);
  };

  // QR actions
  const handleQRDeduct = async () => {
    if(!scannedProduct) return;
    await updateStock(scannedProduct.id,-qrQty,'Escaneo QR');
    showNotif("✓ Stock actualizado"); setShowQRModal(false);
  };
  const handleQRAddToService = async () => {
    if(!scannedProduct||!selectedRepairForQR) return;
    const repair=repairs.find(r=>r.id===selectedRepairForQR); if(!repair) return;
    const existing=repair.partsUsed||[];
    const idx=existing.findIndex(p=>p.id===scannedProduct.id);
    const updated=idx>=0?existing.map((p,i)=>i===idx?{...p,qty:p.qty+qrQty}:p):[...existing,{id:scannedProduct.id,name:scannedProduct.name,qty:qrQty,cost:scannedProduct.cost}];
    const partsCost=updated.reduce((s,p)=>s+(p.cost*p.qty),0);
    await updateDoc(doc(db,'artifacts',appId,'public','data','repairs',selectedRepairForQR),{partsUsed:updated,partsCost,totalCost:partsCost+Number(repair.laborCost||0)});
    await updateStock(scannedProduct.id,-qrQty,`Servicio ${repair.orderNumber||repair.vehicle}`);
    showNotif("✓ Agregado al servicio"); setShowQRModal(false);
  };

  // WhatsApp — FIX: proper international format
  const sendWhatsApp = budget => {
    const rawPhone = budget.clientPhone||'';
    let phone = rawPhone.replace(/\D/g,'');
    if (!phone) { showNotif("El cliente no tiene teléfono cargado","error"); return; }
    // Argentina: add country code if needed
    if (!phone.startsWith('54')) phone = '54' + phone;
    const empresa = (tallerConfig.empresas||[]).find(e=>e.id===budget.empresaId) || tallerConfig.empresas?.[0] || tallerConfig;
    const msg = encodeURIComponent(
      `Hola ${budget.clientName}! 👋\n\nTe mandamos el presupuesto de *${empresa.nombre}*:\n\n🚗 *${budget.vehicle}*${budget.plate?` (${budget.plate})`:''}\n📋 ${budget.description||'Servicio solicitado'}\n\n💰 *Total: $${budget.totalCost?.toLocaleString()}*\n\nCualquier consulta estamos a disposición. ¡Saludos!`
    );
    window.open(`https://wa.me/${phone}?text=${msg}`,'_blank');
  };

  // Config — saved to Firebase
  const saveConfigToFirebase = async (cfg, users) => {
    const ref = doc(db,'artifacts',appId,'public','appconfig');
    try { await updateDoc(ref, { ...(cfg ? {tallerConfig:cfg} : {}), ...(users ? {tallerUsers:users} : {}) }); }
    catch { await setDoc(ref, { tallerConfig: cfg || tallerConfig, tallerUsers: users || tallerUsers, orderCounter }, {merge:true}); }
  };
  const saveConfig = async () => {
    setTallerConfig(editConfig);
    await saveConfigToFirebase(editConfig, null);
    setEditConfig(null); showNotif("✓ Configuración guardada");
  };
  const saveUsers = async (users) => {
    setTallerUsers(users);
    await saveConfigToFirebase(null, users);
  };

  // Print
  const printBudget = budget => {
    const empresa = (tallerConfig.empresas||[]).find(e=>e.id===budget.empresaId) || tallerConfig.empresas?.[0] || {nombre:tallerConfig.nombre,cuit:'',direccion:tallerConfig.direccion,telefono:tallerConfig.telefono,email:tallerConfig.email};
    const dateStr=budget.date?new Date(budget.date+'T12:00:00').toLocaleDateString('es-AR'):new Date().toLocaleDateString('es-AR');
    const win=window.open('','_blank');
    win.document.write(`<!DOCTYPE html><html><head><title>Presupuesto</title>
    <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Arial,sans-serif;padding:40px;color:#1e293b;max-width:820px;margin:0 auto}
    .header{display:flex;justify-content:space-between;padding-bottom:24px;margin-bottom:28px;border-bottom:3px solid #0f172a}
    h1{font-size:26px;font-weight:900;color:#0f172a}.sub{font-size:12px;color:#64748b;margin-top:5px;line-height:1.7}.cuit{font-size:11px;color:#94a3b8;margin-top:3px}
    .doc-title{font-size:20px;font-weight:900;color:#0f172a;text-transform:uppercase;letter-spacing:2px;text-align:right}.date{font-size:12px;color:#94a3b8;text-align:right;margin-top:4px}
    .sec{margin:18px 0}.sec-title{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;color:#94a3b8;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid #f1f5f9}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.item label{font-size:10px;color:#94a3b8;font-weight:700;text-transform:uppercase;display:block;margin-bottom:2px}.item span{font-size:14px;font-weight:700}
    table{width:100%;border-collapse:collapse}thead tr{background:#0f172a}th{padding:10px 14px;text-align:left;font-size:11px;font-weight:700;color:white;text-transform:uppercase}
    td{padding:10px 14px;font-size:13px;border-bottom:1px solid #f1f5f9}tr:nth-child(even) td{background:#f8fafc}.labor td{background:#f1f5f9;font-weight:700}
    .total{background:#0f172a;color:white;padding:18px 22px;border-radius:12px;display:flex;justify-content:space-between;align-items:center;margin-top:20px}
    .total-label{font-size:12px;opacity:0.6;text-transform:uppercase;letter-spacing:1px}.total-value{font-size:26px;font-weight:900}
    .notes{background:#fffbeb;border:1px solid #fde68a;padding:14px;border-radius:10px;font-size:13px;color:#92400e;margin-top:14px}
    .footer{margin-top:30px;padding-top:16px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center}
    .footer p{font-size:11px;color:#94a3b8}.validity{background:#f0fdf4;color:#166534;padding:5px 14px;border-radius:20px;font-size:11px;font-weight:700}
    </style></head><body>
    <div class="header">
      <div><h1>${empresa.nombre}</h1><p class="sub">${empresa.direccion}<br>${empresa.telefono} · ${empresa.email}</p>${empresa.cuit?`<p class="cuit">CUIT: ${empresa.cuit}</p>`:''}</div>
      <div><div class="doc-title">Presupuesto${budget.budgetNumber?` #${budget.budgetNumber}`:''}</div><div class="date">Fecha: ${dateStr}</div></div>
    </div>
    <div class="sec"><div class="sec-title">Cliente</div><div class="grid">
    <div class="item"><label>Nombre</label><span>${budget.clientName}</span></div>
    <div class="item"><label>Teléfono</label><span>${budget.clientPhone||'—'}</span></div></div></div>
    <div class="sec"><div class="sec-title">Vehículo</div><div class="grid">
    <div class="item"><label>Vehículo</label><span>${budget.vehicle}</span></div>
    <div class="item"><label>Patente</label><span>${budget.plate||'—'}</span></div>
    ${budget.km?`<div class="item"><label>Km</label><span>${Number(budget.km).toLocaleString()} km</span></div>`:''}
    </div></div>
    ${budget.description?`<div class="sec"><div class="sec-title">Trabajo</div><p style="font-size:14px;line-height:1.7">${budget.description}</p></div>`:''}
    <div class="sec"><div class="sec-title">Detalle</div>
    <table><thead><tr><th>Descripción</th><th>Cant.</th><th>Precio unit.</th><th>Subtotal</th></tr></thead><tbody>
    ${(budget.partsUsed||[]).map(p=>`<tr><td>${p.name}</td><td>${p.qty}</td><td>$${Number(p.cost).toLocaleString()}</td><td>$${(p.cost*p.qty).toLocaleString()}</td></tr>`).join('')}
    ${(budget.extras||[]).filter(e=>e.desc||e.price).map(e=>`<tr><td>${e.desc||'—'}</td><td>${e.qty||1}</td><td>$${Number(e.price||0).toLocaleString()}</td><td>$${(Number(e.qty||1)*Number(e.price||0)).toLocaleString()}</td></tr>`).join('')}
    <tr class="labor"><td colspan="3">Realización de trabajo</td><td>$${Number(budget.laborCost||0).toLocaleString()}</td></tr>
    </tbody></table></div>
    <div class="total"><span class="total-label">Total</span><span class="total-value">$${(budget.totalCost||0).toLocaleString()}</span></div>
    ${budget.notes?`<div class="notes">📝 ${budget.notes}</div>`:''}
    <div class="footer"><p>${empresa.nombre} · ${empresa.telefono}</p><span class="validity">✓ Válido 15 días</span></div>
    </body></html>`);
    win.document.close();
    win.focus();
    win.print();
    win.onafterprint = () => { win.close(); };
  };

  const printWorkOrder = repair => {
    const win = window.open('','_blank');
    const dateStr = repair.date?.seconds ? new Date(repair.date.seconds*1000).toLocaleDateString('es-AR') : new Date().toLocaleDateString('es-AR');
    const paid = (repair.payments||[]).reduce((s,p)=>s+p.amount,0);
    const debe = (repair.totalCost||0) - paid;
    win.document.write(`<!DOCTYPE html><html><head><title>Orden de Trabajo</title>
    <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Arial,sans-serif;padding:32px;color:#1e293b;max-width:760px;margin:0 auto}
    .header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:20px;margin-bottom:20px;border-bottom:3px solid #f97316}
    .title{font-size:28px;font-weight:900;color:#0f172a}.orden{font-size:14px;font-weight:800;color:#f97316;letter-spacing:2px;text-transform:uppercase}
    .badge{display:inline-block;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px}
    .sec{margin:16px 0}.sec-title{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;color:#94a3b8;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid #f1f5f9}
    .grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px}.item label{font-size:10px;color:#94a3b8;font-weight:700;text-transform:uppercase;display:block;margin-bottom:2px}.item span{font-size:14px;font-weight:700}
    table{width:100%;border-collapse:collapse;margin-top:8px}th{padding:8px 12px;text-align:left;font-size:11px;font-weight:700;background:#0f172a;color:white;text-transform:uppercase}
    td{padding:9px 12px;font-size:13px;border-bottom:1px solid #f1f5f9}
    .totals{margin-top:16px;border:2px solid #e2e8f0;border-radius:12px;overflow:hidden}
    .tot-row{display:flex;justify-content:space-between;padding:10px 16px;font-size:13px;font-weight:600;border-bottom:1px solid #f1f5f9}
    .tot-row.main{background:#0f172a;color:white;font-size:16px;font-weight:900}
    .tot-row.debe{background:#fef2f2;color:#dc2626;font-weight:800}
    .firma{margin-top:32px;display:grid;grid-template-columns:1fr 1fr;gap:40px}
    .firma-box{border-top:2px solid #e2e8f0;padding-top:10px;text-align:center;font-size:11px;color:#94a3b8;font-weight:700;text-transform:uppercase}
    .notas{background:#fffbeb;border:1px solid #fde68a;padding:12px;border-radius:10px;font-size:13px;color:#92400e;margin-top:12px}
    </style></head><body>
    <div class="header">
      <div><div class="title">${tallerConfig.nombre}</div><p style="font-size:12px;color:#64748b;margin-top:4px">${tallerConfig.direccion} · ${tallerConfig.telefono}</p></div>
      <div style="text-align:right"><div class="orden">Orden de Trabajo</div><div style="font-size:22px;font-weight:900;color:#0f172a">${repair.orderNumber||'—'}</div><div style="font-size:11px;color:#94a3b8">${dateStr}</div></div>
    </div>
    <div class="sec"><div class="sec-title">Vehículo</div><div class="grid2">
      <div class="item"><label>Vehículo</label><span>${repair.vehicle||'—'}</span></div>
      <div class="item"><label>Patente</label><span>${repair.plate||'—'}</span></div>
      ${repair.km?`<div class="item"><label>Kilometraje</label><span>${Number(repair.km).toLocaleString()} km</span></div>`:''}
      ${repair.clientName?`<div class="item"><label>Cliente</label><span>${repair.clientName}</span></div>`:''}
    </div></div>
    <div class="sec"><div class="sec-title">Trabajo a realizar</div>
      <p style="font-size:14px;line-height:1.8;margin-top:6px">${repair.description||'—'}</p>
    </div>
    ${repair.partsUsed?.length?`<div class="sec"><div class="sec-title">Repuestos utilizados</div>
    <table><thead><tr><th>Repuesto</th><th>Cantidad</th><th>Precio unit.</th><th>Subtotal</th></tr></thead><tbody>
    ${repair.partsUsed.map(p=>`<tr><td>${p.name}</td><td>${p.qty}</td><td>$${Number(p.cost).toLocaleString()}</td><td>$${(p.cost*p.qty).toLocaleString()}</td></tr>`).join('')}
    </tbody></table></div>`:''}
    <div class="totals">
      ${repair.laborCost>0?`<div class="tot-row"><span>Mano de obra</span><span>$${Number(repair.laborCost||0).toLocaleString()}</span></div>`:''}
      ${(repair.partsCost||0)>0?`<div class="tot-row"><span>Repuestos</span><span>$${Number(repair.partsCost||0).toLocaleString()}</span></div>`:''}
      <div class="tot-row main"><span>TOTAL</span><span>$${Number(repair.totalCost||0).toLocaleString()}</span></div>
      ${paid>0?`<div class="tot-row" style="background:#f0fdf4;color:#16a34a"><span>Pagado</span><span>$${paid.toLocaleString()}</span></div>`:''}
      ${debe>0?`<div class="tot-row debe"><span>Saldo pendiente</span><span>$${debe.toLocaleString()}</span></div>`:''}
    </div>
    ${repair.notes?`<div class="notas">📝 ${repair.notes}</div>`:''}
    <div class="firma">
      <div class="firma-box">Firma del cliente</div>
      <div class="firma-box">Firma del mecánico</div>
    </div>
    </body></html>`);
    win.document.close();
    win.focus();
    win.print();
    win.onafterprint = () => { win.close(); };
  };

  const printQRLabel = product => {
    const win=window.open('','_blank');
    win.document.write(`<!DOCTYPE html><html><head><title>QR</title><style>body{margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh}.label{width:6cm;padding:8px;border:1.5px solid #000;display:flex;flex-direction:column;align-items:center;gap:4px;font-family:Arial}.name{font-size:8px;font-weight:900;text-align:center;text-transform:uppercase}.sku{font-size:6px;color:#666;font-family:monospace}.loc{font-size:6px;color:#999}</style></head><body>
    <div class="label"><div class="name">${product.name}</div><img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${product.sku}" style="width:3.5cm;height:3.5cm"/><div class="sku">${product.sku}</div>${product.location?`<div class="loc">📍 ${product.location}</div>`:''}</div>
    <script>window.onload=()=>setTimeout(()=>window.print(),500)</script></body></html>`);
    win.document.close();
  };

  // Stats
  const monthRepairs=repairs.filter(r=>r.date?.seconds&&new Date(r.date.seconds*1000).getMonth()===statsMonth);
  const monthRevenue=monthRepairs.reduce((s,r)=>s+(r.totalCost||0),0);
  const vehicleHistory=repairs.filter(r=>vehicleFilter&&(r.plate?.toLowerCase().includes(vehicleFilter.toLowerCase())||r.vehicle?.toLowerCase().includes(vehicleFilter.toLowerCase())));
  const globalResults=globalSearch.length>1?{
    inventory:inventory.filter(i=>i.name?.toLowerCase().includes(globalSearch.toLowerCase())),
    repairs:repairs.filter(r=>r.vehicle?.toLowerCase().includes(globalSearch.toLowerCase())||r.plate?.toLowerCase().includes(globalSearch.toLowerCase())||r.clientName?.toLowerCase().includes(globalSearch.toLowerCase())),
    clients:clients.filter(c=>c.name?.toLowerCase().includes(globalSearch.toLowerCase())||c.phone?.includes(globalSearch)),
    vehicles:vehicles.filter(v=>v.plate?.toLowerCase().includes(globalSearch.toLowerCase())||`${v.make} ${v.model}`.toLowerCase().includes(globalSearch.toLowerCase())),
  }:null;
  const chartData=Array.from({length:6},(_,i)=>{
    const month=(new Date().getMonth()-5+i+12)%12;
    const yr=new Date().getFullYear()-(new Date().getMonth()-5+i<0?1:0);
    const total=repairs.filter(r=>{if(!r.date?.seconds)return false;const d=new Date(r.date.seconds*1000);return d.getMonth()===month&&d.getFullYear()===yr;}).reduce((s,r)=>s+(r.totalCost||0),0);
    return {month:MONTHS[month].slice(0,3),total};
  });
  const chartMax=Math.max(...chartData.map(d=>d.total),1);
  const serviceCounts={};
  repairs.forEach(r=>{const k=r.description?.split(' ').slice(0,3).join(' ')||'Sin desc';serviceCounts[k]=(serviceCounts[k]||0)+1;});
  const topServices=Object.entries(serviceCounts).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const partCounts={};
  repairs.forEach(r=>r.partsUsed?.forEach(p=>{partCounts[p.name]=(partCounts[p.name]||0)+p.qty;}));
  const topParts=Object.entries(partCounts).sort((a,b)=>b[1]-a[1]).slice(0,5);

  const dm=darkMode;

  // ── LOGIN SCREEN ──────────────────────────────────────────────
  if (!currentUser) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',padding:'16px',background:'linear-gradient(145deg,#0a0a0f 0%,#12100e 40%,#1a0f08 100%)'}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Space+Grotesk:wght@400;500;600;700&display=swap');
      *{font-family:'Space Grotesk',sans-serif;box-sizing:border-box}
      .font-display{font-family:'Outfit',sans-serif}
      .login-input{width:100%;padding:12px 12px 12px 40px;border-radius:12px;background:rgba(255,255,255,0.07);border:1.5px solid rgba(255,255,255,0.1);color:white;outline:none;font-size:14px;font-family:'Space Grotesk',sans-serif}
      .login-input::placeholder{color:#4b5563}
      .login-input:focus{border-color:#f97316;box-shadow:0 0 0 4px rgba(249,115,22,0.1)}
      .login-btn{width:100%;padding:14px;border-radius:16px;background:linear-gradient(135deg,#f97316,#ea580c);color:white;font-weight:700;font-size:15px;border:none;cursor:pointer;box-shadow:0 4px 16px rgba(249,115,22,0.4);transition:all 0.2s}
      .login-btn:hover{transform:translateY(-1px);box-shadow:0 8px 24px rgba(249,115,22,0.5)}
      .login-card{background:rgba(255,255,255,0.05);border:1px solid rgba(255,107,26,0.2);backdrop-filter:blur(24px);border-radius:24px;padding:28px;box-shadow:0 24px 64px rgba(0,0,0,0.4)}
      `}</style>
      <div style={{width:'100%',maxWidth:'380px'}}>
        <div style={{textAlign:'center',marginBottom:'32px'}}>
          <div className="mx-auto mb-5 relative w-28 h-28">
            <div className="w-28 h-28 rounded-3xl flex items-center justify-center shadow-2xl" style={{background:'linear-gradient(135deg,#1a0f08,#2d1a0a)',border:'1px solid rgba(249,115,22,0.3)'}}>
              <svg width="72" height="72" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="8" y="32" width="56" height="22" rx="6" fill="#1e293b" stroke="#f97316" strokeWidth="1.5"/>
                <rect x="14" y="38" width="12" height="8" rx="2" fill="#0d1117" stroke="#3b82f6" strokeWidth="1.2"/>
                <rect x="46" y="38" width="12" height="8" rx="2" fill="#0d1117" stroke="#3b82f6" strokeWidth="1.2"/>
                <ellipse cx="20" cy="56" rx="7" ry="7" fill="#0d1117" stroke="#f97316" strokeWidth="2"/>
                <ellipse cx="20" cy="56" rx="3" ry="3" fill="#f97316"/>
                <ellipse cx="52" cy="56" rx="7" ry="7" fill="#0d1117" stroke="#f97316" strokeWidth="2"/>
                <ellipse cx="52" cy="56" rx="3" ry="3" fill="#f97316"/>
                <path d="M14 32 L22 18 L50 18 L58 32" stroke="#f97316" strokeWidth="1.5" fill="#1e293b"/>
                <rect x="26" y="20" width="20" height="10" rx="2" fill="#0d1117" stroke="#3b82f6" strokeWidth="1"/>
                <path d="M42 8 L46 4 M42 8 L38 4 M42 8 L42 3" stroke="#f97316" strokeWidth="1.5" strokeLinecap="round"/>
                <circle cx="42" cy="11" r="3" fill="#f97316" opacity="0.8"/>
              </svg>
            </div>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-xl flex items-center justify-center" style={{background:'linear-gradient(135deg,#f97316,#ea580c)',boxShadow:'0 4px 12px rgba(249,115,22,0.5)'}}><Wrench size={14} className="text-white"/></div>
          </div>
          <h1 style={{fontFamily:"'Outfit',sans-serif",fontWeight:900,fontSize:'2rem',color:'white',letterSpacing:'-1px',margin:'16px 0 4px'}}>TallerMaster</h1>
          <p style={{color:'#6b7280',fontSize:'13px',marginTop:'4px'}}>Sistema de gestión de taller</p>
        </div>
        <div className="login-card" style={{display:'flex',flexDirection:'column',gap:'16px'}}>
          <div>
            <span style={{fontSize:'11px',fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'1px',display:'block',marginBottom:'5px'}}>Usuario</span>
            <div className="relative mt-1">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16}/>
              <input className="login-input" placeholder="tu usuario" value={loginForm.username} onChange={e=>setLoginForm(f=>({...f,username:e.target.value}))} onKeyDown={e=>e.key==='Enter'&&handleLogin()}/>
            </div>
          </div>
          <div>
            <span style={{fontSize:'11px',fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'1px',display:'block',marginBottom:'5px'}}>Contraseña</span>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16}/>
              <input type={showPw?'text':'password'} className="login-input" style={{paddingRight:'40px'}} placeholder="••••••••" value={loginForm.password} onChange={e=>setLoginForm(f=>({...f,password:e.target.value}))} onKeyDown={e=>e.key==='Enter'&&handleLogin()}/>
              <button type="button" onClick={()=>setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">{showPw?<EyeOff size={16}/>:<Eye size={16}/>}</button>
            </div>
          </div>
          {loginError&&<p style={{color:'#f87171',fontSize:'13px',fontWeight:700,textAlign:'center'}}>{loginError}</p>}
          <div className="flex items-center gap-3 cursor-pointer" onClick={()=>setRememberMe(!rememberMe)}>
            <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-all" style={{background:rememberMe?'linear-gradient(135deg,#f97316,#ea580c)':'rgba(255,255,255,0.07)',border:rememberMe?'none':'1.5px solid rgba(255,255,255,0.15)'}}>
              {rememberMe&&<Check size={12} className="text-white"/>}
            </div>
            <span style={{color:'#cbd5e1',fontSize:'14px',userSelect:'none'}}>Recordarme en este dispositivo</span>
          </div>
          <button onClick={handleLogin} className="login-btn" disabled={!configLoaded} style={{opacity:configLoaded?1:0.6,cursor:configLoaded?'pointer':'not-allowed'}}>
            {configLoaded?'Ingresar':'Cargando...'}
          </button>

        </div>
      </div>
    </div>
  );

  if (loading) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#090b0f'}}>
      <Loader2 className="animate-spin" size={32} color="#f97316"/>
    </div>
  );

  // ── MAIN APP ──────────────────────────────────────────────────
  return (
    <div className={`min-h-screen font-sans ${view==='dashboard'?'md:pl-64':''}`} style={{background:'#090b0f',color:'white'}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Space+Grotesk:wght@400;500;600;700&display=swap');
        *{font-family:'Space Grotesk',sans-serif;box-sizing:border-box}
        .font-display{font-family:'Outfit',sans-serif}
        .page-title{font-family:'Outfit',sans-serif;font-size:26px;font-weight:800;letter-spacing:-1px}

        /* CARDS */
        .card{border-radius:18px;transition:all 0.22s cubic-bezier(.4,0,.2,1)}
        .card-s{box-shadow:0 1px 3px rgba(0,0,0,0.06),0 4px 16px rgba(0,0,0,0.06)}
        .card-dark{box-shadow:0 1px 3px rgba(0,0,0,0.3),0 4px 20px rgba(0,0,0,0.2)}
        .card-hover:hover{transform:translateY(-4px);box-shadow:0 16px 40px rgba(0,0,0,0.18)!important}

        /* INPUTS */
        .inp{border-radius:12px;padding:12px 15px;width:100%;outline:none;transition:all 0.2s;font-size:14px;border:2px solid;font-family:'Space Grotesk',sans-serif}
        .inp:focus{border-color:#f97316!important;box-shadow:0 0 0 4px rgba(249,115,22,0.1)}

        /* BUTTONS */
        .btn-primary{background:linear-gradient(135deg,#ff6b1a,#e85510);color:white;padding:13px 20px;border-radius:13px;font-weight:700;display:flex;align-items:center;gap:8px;justify-content:center;cursor:pointer;border:none;width:100%;font-size:15px;box-shadow:0 4px 20px rgba(249,115,22,0.4),0 1px 3px rgba(0,0,0,0.2);transition:all 0.2s;letter-spacing:0.2px}
        .btn-primary:hover{transform:translateY(-2px);box-shadow:0 10px 28px rgba(249,115,22,0.5)}.btn-primary:disabled{opacity:0.45;transform:none;cursor:not-allowed}
        .btn-dark{background:#1e293b;color:#f8fafc;padding:9px 16px;border-radius:13px;font-weight:700;display:flex;align-items:center;gap:6px;justify-content:center;cursor:pointer;border:none;font-size:13px;transition:all 0.2s;box-shadow:0 2px 8px rgba(0,0,0,0.2)}.btn-dark:hover{background:#334155}
        .btn-ghost{padding:9px 14px;border-radius:13px;font-weight:600;display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;transition:all 0.2s;border:2px solid}

        /* LABELS & STATUS */
        .lbl{font-size:11px;font-weight:700;color:#94a3b8;margin-bottom:5px;text-transform:uppercase;letter-spacing:1px;display:block}
        .status-pill{padding:5px 12px;border-radius:20px;font-size:11px;font-weight:700;display:inline-flex;align-items:center;gap:5px;border:1.5px solid transparent}

        /* SIDEBAR NAV */
        .nav-item{width:100%;display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:12px;font-size:13px;font-weight:600;transition:all 0.2s;cursor:pointer;border:none;text-align:left;letter-spacing:0.1px}
        .nav-item.active{background:linear-gradient(135deg,#ff6b1a,#e85510);color:white;box-shadow:0 4px 16px rgba(249,115,22,0.4)}
        .nav-item:not(.active){color:#6b7280}.nav-item:not(.active):hover{background:rgba(255,255,255,0.07);color:#e5e7eb}

        /* MODALS */
        .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.7);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);z-index:300;display:flex;align-items:flex-end;justify-content:center;padding:0}
        .modal-sheet{border-radius:28px 28px 0 0;padding:28px;width:100%;max-width:480px;max-height:90vh;overflow-y:auto}
        .modal-center{position:fixed;inset:0;background:rgba(0,0,0,0.7);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);z-index:300;display:flex;align-items:center;justify-content:center;padding:20px}

        /* MISC */
        .g-card{border-radius:18px;padding:20px;overflow:hidden;position:relative}
        .shutter-btn{width:72px;height:72px;border-radius:50%;background:white;border:4px solid rgba(255,255,255,0.4);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all 0.15s;box-shadow:0 4px 20px rgba(0,0,0,0.4)}.shutter-btn:active{transform:scale(0.92)}
        .shutter-inner{width:56px;height:56px;border-radius:50%;background:white;border:2px solid #e2e8f0}

        /* ANIMATIONS */
        @keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
        .anim{animation:slideUp 0.22s cubic-bezier(.22,1,.36,1)}
        .fade{animation:fadeIn 0.18s ease-out}
        .anim-fast{animation:slideUp 0.15s cubic-bezier(.22,1,.36,1)}

        /* SCROLLBAR */
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:rgba(249,115,22,0.3);border-radius:4px}

        /* FLOATING NAV */
        .floating-nav{position:fixed;bottom:16px;left:50%;transform:translateX(-50%);z-index:100;border-radius:32px;padding:8px 12px;display:flex;align-items:center;gap:2px;backdrop-filter:blur(28px);-webkit-backdrop-filter:blur(28px);border:1px solid rgba(255,255,255,0.1)}
        .float-btn{display:flex;flex-direction:column;align-items:center;gap:3px;padding:8px 14px;border-radius:22px;border:none;cursor:pointer;transition:all 0.22s cubic-bezier(.4,0,.2,1);min-width:58px}
        .float-btn.active{background:linear-gradient(135deg,#ff6b1a,#e85510);box-shadow:0 4px 16px rgba(249,115,22,0.5)}
        .float-btn:not(.active){background:transparent}
        .float-btn.active span{color:white;font-weight:700}.float-btn:not(.active) span{color:#6b7280}
        .float-btn.center-btn{background:linear-gradient(135deg,#ff6b1a,#e85510);border-radius:50%;width:54px;height:54px;min-width:54px;padding:0;justify-content:center;margin-top:-10px;box-shadow:0 6px 24px rgba(249,115,22,0.6),0 0 0 4px rgba(249,115,22,0.15)}

        /* INVENTORY THUMBNAIL */
        .inv-thumb{width:52px;height:52px;border-radius:12px;object-fit:cover;flex-shrink:0}
        .inv-thumb-placeholder{width:52px;height:52px;border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0}

        /* SECTION DIVIDERS */
        .section-header{font-family:'Outfit',sans-serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;opacity:0.4;padding:16px 0 8px}

        /* BADGE */
        .badge{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;border:1.5px solid}
      `}</style>

      {/* CONFIRM MODALS */}
      {confirmDelete&&(
        <div className="modal-center">
          <div className={`${dm?'bg-[#161b22]':'bg-white'} rounded-3xl p-7 max-w-sm w-full`}>
            <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center bg-red-100"><Trash2 size={26} className="text-red-600"/></div>
            <h3 className={`font-display font-black text-xl text-center mb-2 ${dm?'text-white':''}`}>¿Eliminar?</h3>
            <p className={`text-center text-sm mb-6 ${dm?'text-slate-400':'text-slate-500'}`}>{confirmDelete.label}</p>
            <div className="flex gap-3">
              <button onClick={()=>setConfirmDelete(null)} className={`btn-ghost flex-1 ${dm?'border-[#30363d] text-slate-300':'border-slate-200 text-slate-600'}`}>Cancelar</button>
              <button onClick={confirmDeleteItem} className="btn-primary flex-1" style={{background:'linear-gradient(135deg,#ef4444,#dc2626)'}}><Trash2 size={16}/>Eliminar</button>
            </div>
          </div>
        </div>
      )}
      {confirmDeleteAll&&(
        <div className="modal-center">
          <div className={`${dm?'bg-[#161b22]':'bg-white'} rounded-3xl p-7 max-w-sm w-full`}>
            <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center bg-red-100"><AlertTriangle size={26} className="text-red-600"/></div>
            <h3 className={`font-display font-black text-xl text-center mb-2 ${dm?'text-white':''}`}>¿Eliminar todo?</h3>
            <p className={`text-center text-sm mb-6 ${dm?'text-slate-400':'text-slate-500'}`}>Esta acción no se puede deshacer.</p>
            <div className="flex gap-3">
              <button onClick={()=>setConfirmDeleteAll(null)} className={`btn-ghost flex-1 ${dm?'border-[#30363d] text-slate-300':'border-slate-200 text-slate-600'}`}>Cancelar</button>
              <button onClick={confirmDeleteAllItems} className="btn-primary flex-1" style={{background:'linear-gradient(135deg,#ef4444,#dc2626)'}}><Trash2 size={16}/>Sí, borrar</button>
            </div>
          </div>
        </div>
      )}

      {/* QR MODAL — bottom sheet style */}
      {showQRModal&&scannedProduct&&(
        <div className="modal-overlay" onClick={()=>setShowQRModal(false)}>
          <div className="modal-sheet anim w-full" style={{background:'#161b22'}} onClick={e=>e.stopPropagation()}>
            <div style={{width:'40px',height:'4px',borderRadius:'9999px',background:'#30363d',margin:'0 auto 20px'}}/>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'16px'}}>
              <div>
                <p style={{fontSize:'10px',fontWeight:700,color:'#f97316',textTransform:'uppercase',letterSpacing:'2px',marginBottom:'4px'}}>Escaneado</p>
                <h3 style={{fontFamily:"'Outfit',sans-serif",fontWeight:900,fontSize:'20px',color:'white'}}>{scannedProduct.name}</h3>
                <p style={{fontFamily:'monospace',fontSize:'11px',color:'#6b7280',marginTop:'2px'}}>{scannedProduct.sku}</p>
              </div>
              <button onClick={()=>setShowQRModal(false)} style={{padding:'8px',borderRadius:'12px',background:'rgba(255,255,255,0.05)',border:'none',cursor:'pointer',color:'#9ca3af'}}><X size={18}/></button>
            </div>
            {scannedProduct.imageUrl&&<img src={scannedProduct.imageUrl} alt="" className="w-full h-36 object-contain rounded-2xl mb-4"/>}
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[{label:'Stock',val:scannedProduct.quantity,red:scannedProduct.quantity<=scannedProduct.minStock},{label:'Costo',val:`$${Number(scannedProduct.cost).toLocaleString()}`},{label:'Ubic.',val:scannedProduct.location||'—'}].map(({label,val,red})=>(
                <div key={label} style={{background:'#0d1117',borderRadius:'16px',padding:'12px',textAlign:'center'}}>
                  <p style={{fontSize:'18px',fontWeight:900,fontFamily:"'Outfit',sans-serif",color:red?'#ef4444':'white',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{val}</p>
                  <p style={{fontSize:'10px',color:'#6b7280',fontWeight:700,textTransform:'uppercase',marginTop:'2px'}}>{label}</p>
                </div>
              ))}
            </div>
            <div className={`flex items-center justify-center gap-4 rounded-2xl p-3 mb-4 ${dm?'bg-[#0d1117]':'bg-slate-50'}`}>
              <button onClick={()=>setQrQty(q=>Math.max(1,q-1))} className={`p-2 rounded-xl ${dm?'bg-[#161b22]':'bg-white'} shadow`}><MinusCircle className="text-red-400" size={20}/></button>
              <div className="text-center"><p className="text-2xl font-black font-display">{qrQty}</p><p className="text-xs text-slate-400">unidades</p></div>
              <button onClick={()=>setQrQty(q=>Math.min(scannedProduct.quantity,q+1))} className={`p-2 rounded-xl ${dm?'bg-[#161b22]':'bg-white'} shadow`}><PlusCircle className="text-emerald-500" size={20}/></button>
            </div>
            {!qrAction&&<div className="grid grid-cols-2 gap-3">
              <button onClick={()=>setQrAction('deduct')} style={{background:'#0d1117',borderRadius:'16px',padding:'16px',display:'flex',flexDirection:'column',alignItems:'center',gap:'8px',cursor:'pointer',border:'none'}}><MinusCircle size={22} color="#ef4444"/><span style={{fontWeight:700,fontSize:'13px',color:'white'}}>Restar stock</span></button>
              <button onClick={()=>setQrAction('service')} style={{background:'#0d1117',borderRadius:'16px',padding:'16px',display:'flex',flexDirection:'column',alignItems:'center',gap:'8px',cursor:'pointer',border:'none'}}><Car size={22} color="#3b82f6"/><span style={{fontWeight:700,fontSize:'13px',color:'white'}}>A servicio</span></button>
            </div>}
            {qrAction==='deduct'&&<div className="space-y-3"><p className="text-sm font-bold">Restar <span className="text-red-500">{qrQty}</span> unidad(es)</p><div className="flex gap-2"><button onClick={()=>setQrAction(null)} className={`btn-ghost flex-1 ${dm?'border-[#30363d] text-slate-300':'border-slate-200 text-slate-600'}`}>Volver</button><button onClick={handleQRDeduct} className="btn-primary flex-1" style={{background:'linear-gradient(135deg,#ef4444,#dc2626)'}}><Check size={16}/>Confirmar</button></div></div>}
            {qrAction==='service'&&<div className="space-y-3"><span className="lbl">Servicio activo</span><select className={`inp ${dm?'bg-[#0d1117] border-[#30363d] text-white':'bg-slate-50 border-slate-200'}`} value={selectedRepairForQR} onChange={e=>setSelectedRepairForQR(e.target.value)}><option value="">— Elegí —</option>{repairs.filter(r=>r.status!=='entregado').map(r=><option key={r.id} value={r.id}>{r.vehicle} {r.plate&&`· ${r.plate}`}</option>)}</select><div className="flex gap-2"><button onClick={()=>setQrAction(null)} className={`btn-ghost flex-1 ${dm?'border-[#30363d] text-slate-300':'border-slate-200 text-slate-600'}`}>Volver</button><button onClick={handleQRAddToService} disabled={!selectedRepairForQR} className="btn-primary flex-1"><Check size={16}/>Agregar</button></div></div>}
          </div>
        </div>
      )}

      {/* PAYMENT MODAL */}
      {showPaymentModal&&(
        <div className="modal-center" onClick={()=>setShowPaymentModal(null)}>
          <div className={`${dm?'bg-[#161b22]':'bg-white'} rounded-3xl p-7 max-w-sm w-full`} onClick={e=>e.stopPropagation()}>
            <h3 className={`font-display font-black text-xl mb-1 ${dm?'text-white':'text-slate-900'}`}>Registrar pago</h3>
            {(()=>{const rep=repairs.find(r=>r.id===showPaymentModal);if(!rep)return null;
              const totalPaid=(rep.payments||[]).reduce((s,p)=>s+p.amount,0);
              const remaining=Math.max(0,(rep.totalCost||0)-totalPaid);
              return(<>
                <div className={`rounded-2xl p-4 mb-4 space-y-1 ${dm?'bg-[#0d1117]':'bg-slate-50'}`}>
                  <div className="flex justify-between text-sm"><span className={dm?'text-slate-400':'text-slate-500'}>Total</span><span className="font-bold">${(rep.totalCost||0).toLocaleString()}</span></div>
                  <div className="flex justify-between text-sm"><span className={dm?'text-slate-400':'text-slate-500'}>Pagado</span><span className="font-bold text-emerald-500">${totalPaid.toLocaleString()}</span></div>
                  <div className="flex justify-between text-sm font-black"><span className={dm?'text-slate-300':'text-slate-700'}>Resta</span><span className="text-red-500">${remaining.toLocaleString()}</span></div>
                </div>
                {(rep.payments||[]).length>0&&<div className="mb-4 space-y-1">
                  {rep.payments.map((p,i)=><div key={i} className={`flex justify-between text-xs rounded-xl px-3 py-2 ${dm?'bg-[#0d1117]':'bg-slate-50'}`}>
                    <span className={dm?'text-slate-400':'text-slate-500'}>{new Date(p.date).toLocaleDateString('es-AR')} · {p.user}</span>
                    <span className="font-bold text-emerald-500">+${p.amount.toLocaleString()}</span>
                  </div>)}
                </div>}
                <div className="space-y-3">
                  <div><span className="lbl">Nuevo pago $</span>
                    <input type="number" min="1" className={`inp ${dm?'bg-[#0d1117] border-[#30363d] text-white':'bg-slate-50 border-slate-200'}`} placeholder="0" value={paymentAmount} onChange={e=>setPaymentAmount(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addPayment(showPaymentModal)}/>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={()=>setShowPaymentModal(null)} className={`btn-ghost flex-1 ${dm?'border-[#30363d] text-slate-300':'border-slate-200 text-slate-600'}`}>Cancelar</button>
                    <button onClick={()=>addPayment(showPaymentModal)} className="btn-primary flex-1"><DollarSign size={15}/>Registrar</button>
                  </div>
                </div>
              </>);
            })()}
          </div>
        </div>
      )}

      {/* SIDEBAR — desktop only, only on dashboard */}
      {view==='dashboard'&&<nav className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-64 p-5 z-50" style={{background:dm?'#07090d':'#0c1018',borderRight:'1px solid rgba(255,255,255,0.06)',boxShadow:'4px 0 24px rgba(0,0,0,0.3)'}}>
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2 rounded-xl flex-shrink-0" style={{background:'linear-gradient(135deg,#f97316,#ea580c)'}}><Wrench size={20} className="text-white"/></div>
          <div><h1 style={{color:'white',fontFamily:"'Outfit',sans-serif",fontWeight:900,fontSize:'15px',lineHeight:1.2}}>TallerMaster</h1><p style={{color:'#6b7280',fontSize:'11px'}}>{tallerConfig.nombre}</p></div>
        </div>
        {/* User badge */}
        <div className="flex items-center gap-2 mb-4 px-3 py-2.5 rounded-xl" style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.07)'}}>
          <div className="w-7 h-7 min-w-[28px] min-h-[28px] rounded-lg flex items-center justify-center text-white text-xs font-black flex-shrink-0" style={{background:'rgba(249,115,22,0.25)',border:'1px solid rgba(249,115,22,0.4)',color:'#f97316'}}>{(currentUser.name||'?')[0]}</div>
          <div style={{flex:1,minWidth:0,overflow:'hidden'}}><p style={{color:'#e2e8f0',fontSize:'12px',fontWeight:700,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{currentUser.name}</p><p style={{color:'#6b7280',fontSize:'10px',textTransform:'capitalize'}}>{currentUser.role}</p></div>
          <button onClick={handleLogout} className="text-slate-600 hover:text-red-400 transition-colors flex-shrink-0 p-1 rounded-lg hover:bg-red-500/10"><LogOut size={13}/></button>
        </div>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={14}/>
          <input className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl text-white placeholder-slate-600 outline-none" style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.07)'}} placeholder="Buscar todo..." value={globalSearch} onChange={e=>setGlobalSearch(e.target.value)} onFocus={()=>setView('search')}/>
        </div>
        <div className="space-y-0.5 flex-1 overflow-y-auto">
          {[{id:'dashboard',Icon:LayoutDashboard,label:'Panel'},{id:'list',Icon:Box,label:'Inventario'},{id:'repairs',Icon:Car,label:'Servicios'},{id:'budgets',Icon:FileText,label:'Presupuestos'},{id:'clients',Icon:Users,label:'Clientes'},{id:'vehicles_list',Icon:Car,label:'Vehículos'},{id:'history',Icon:Clock,label:'Historial'},{id:'stock_history',Icon:History,label:'Mov. Stock'},{id:'stats',Icon:BarChart3,label:'Estadísticas'},{id:'ai_assistant',Icon:Sparkles,label:'Asistente IA'},{id:'config',Icon:Settings,label:'Configuración'},].map(({id,Icon,label})=>(
            <button key={id} onClick={()=>{setView(id);setGlobalSearch('');}} className={`nav-item ${view===id?'active':''}`} style={view===id?{}:{color:'#9ca3af'}}><Icon size={16}/>{label}</button>
          ))}
        </div>
        <div className="flex items-center gap-2 mt-3">
          <button onClick={startQRScan} className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold border" style={{color:'#f97316',borderColor:'rgba(249,115,22,0.3)',background:'rgba(249,115,22,0.05)'}}><QrCode size={15}/>QR</button>
          <button onClick={()=>setDarkMode(!dm)} className="p-2.5 rounded-xl border" style={{borderColor:'rgba(255,255,255,0.1)',background:'rgba(255,255,255,0.05)',color:'white'}}>{dm?<Sun size={17}/>:<Moon size={17}/>}</button>
        </div>
      </nav>}

      {/* FLOATING MOBILE NAV — always visible */}
      <div className="md:hidden floating-nav" style={{background:dm?'rgba(22,27,34,0.92)':'rgba(255,255,255,0.92)',boxShadow:dm?'0 8px 32px rgba(0,0,0,0.5),0 0 0 1px rgba(255,255,255,0.06)':'0 8px 32px rgba(0,0,0,0.15),0 0 0 1px rgba(0,0,0,0.06)'}}>
        {[
          {id:'dashboard',Icon:LayoutDashboard,label:'Panel'},
          {id:'list',Icon:Box,label:'Stock'},
          {id:'scan',Icon:QrCode,label:'',primary:true},
          {id:'repairs',Icon:Car,label:'Servicios'},
          {id:'budgets',Icon:FileText,label:'Pres.'},
        ].map(({id,Icon,label,primary})=>(
          <button key={id} onClick={()=>id==='scan'?startQRScan():setView(id)} className={`float-btn ${primary?'center-btn':view===id?'active':''}`}>
            <Icon size={primary?22:20} className={primary?'text-white':view===id?'text-white':dm?'text-slate-500':'text-slate-400'}/>
            {!primary&&<span className={`text-[9px] font-bold ${view===id?'text-white':dm?'text-slate-500':'text-slate-500'}`}>{label}</span>}
          </button>
        ))}
      </div>

      {/* SLIM TOP BAR */}
      {view!=='dashboard'&&view!=='scan'&&view!=='camera'&&(
        <div style={{position:'fixed',top:0,left:0,right:0,zIndex:40,display:'flex',alignItems:'center',gap:'12px',padding:'12px 16px',background:'rgba(9,11,15,0.95)',borderBottom:'1px solid rgba(255,255,255,0.06)',backdropFilter:'blur(24px)',WebkitBackdropFilter:'blur(24px)'}}>
          <button onClick={()=>setView('dashboard')} style={{padding:'8px',borderRadius:'12px',background:'rgba(255,255,255,0.06)',border:'none',cursor:'pointer',color:'white',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><ChevronLeft size={20}/></button>
          <span style={{fontFamily:"'Outfit',sans-serif",fontWeight:700,fontSize:'16px',color:'white',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{
            {list:'Inventario',repairs:'Servicios',budgets:'Presupuestos',clients:'Clientes',vehicles_list:'Vehículos',history:'Historial',stock_history:'Mov. Stock',stats:'Estadísticas',ai_assistant:'Asistente IA',config:'Configuración',details:'Detalle',add:'Nuevo Repuesto',add_repair:'Nuevo Servicio',edit_repair:'Editar Servicio',add_budget:'Nuevo Presupuesto',edit_budget:'Editar Presupuesto',add_client:'Nuevo Cliente',edit_client:'Editar Cliente',add_vehicle:'Nuevo Vehículo',edit_vehicle:'Editar Vehículo',edit_product:'Editar Repuesto',search:'Búsqueda',camera:'Cámara',scan:'Escáner QR'}[view]||view
          }</span>
          <button onClick={startQRScan} style={{padding:'8px',borderRadius:'12px',background:'rgba(249,115,22,0.1)',border:'none',cursor:'pointer',color:'#f97316',display:'flex',flexShrink:0}}><QrCode size={18}/></button>
        </div>
      )}

      {/* CONTEXTUAL FAB — shows + button per section */}
      {['list','repairs','budgets','clients','vehicles_list'].includes(view)&&!['add','add_repair','edit_repair','add_budget','edit_budget','add_client','edit_client','add_vehicle','edit_vehicle','edit_product'].includes(view)&&(
        <button
          onClick={()=>{
            if(view==='list') setView('add');
            else if(view==='repairs'){setNewRepair(EMPTY_REPAIR);setClientSearch('');setView('add_repair');}
            else if(view==='budgets'){setNewBudget(EMPTY_BUDGET);setClientSearchB('');setView('add_budget');}
            else if(view==='clients') setView('add_client');
            else if(view==='vehicles_list') setView('add_vehicle');
          }}
          style={{position:'fixed',bottom:'130px',right:'20px',zIndex:200,width:'56px',height:'56px',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',background:'linear-gradient(135deg,#ff6b1a,#e85510)',boxShadow:'0 8px 28px rgba(249,115,22,0.55),0 0 0 4px rgba(249,115,22,0.15)',cursor:'pointer',border:'none',transition:'transform 0.2s'}}
        >
          <Plus size={26} className="text-white"/>
        </button>
      )}

      {/* NOTIFICATION */}
      {notification&&(
        <div style={{position:'fixed',top:'16px',left:'50%',transform:'translateX(-50%)',zIndex:400,display:'flex',alignItems:'center',gap:'10px',padding:'12px 20px',borderRadius:'16px',boxShadow:'0 8px 32px rgba(0,0,0,0.4)',animation:'slideUp 0.2s cubic-bezier(.22,1,.36,1)',whiteSpace:'nowrap',background:notification.type==='error'?'linear-gradient(135deg,#ef4444,#dc2626)':'linear-gradient(135deg,#111318,#1a1f2a)',border:notification.type==='error'?'1px solid rgba(239,68,68,0.3)':'1px solid rgba(249,115,22,0.3)'}}>
          {notification.type==='error'?<AlertCircle size={16} color="white"/>:<Check size={16} color="#f97316"/>}
          <span style={{fontWeight:700,fontSize:'13px',color:'white'}}>{notification.msg}</span>
        </div>
      )}

      <main style={{padding:'16px',maxWidth:'640px',margin:'0 auto',paddingTop: view==='dashboard'?'16px':'72px',paddingBottom:'160px'}}>

        {/* DASHBOARD */}
        {view==='dashboard'&&(
          <div className="space-y-6 anim">

            {/* HEADER */}
            <div className="pt-2">
              <p style={{fontSize:'13px',color:'#6b7280'}}>Hola, {currentUser.name} 👋</p>
              <h2 style={{fontFamily:"'Outfit',sans-serif",fontWeight:900,fontSize:'28px',letterSpacing:'-1px',color:'white',marginTop:'2px'}}>{tallerConfig.nombre}</h2>
            </div>

            {/* ACCIONES RÁPIDAS — grandes y claras */}
            <div className="grid grid-cols-3 gap-3">
              {[
                {label:'Nuevo servicio',Icon:Wrench,action:'add_repair',color:'#f97316'},
                {label:'Presupuesto',Icon:FileText,action:'add_budget',color:'#3b82f6'},
                {label:'Repuesto',Icon:Package,action:'add',color:'#10b981'},
              ].map(({label,Icon,action,color})=>(
                <button key={action} onClick={()=>setView(action)} style={{background:'rgba(255,255,255,0.04)',border:`1px solid rgba(255,255,255,0.07)`,borderRadius:'20px',padding:'20px 12px',display:'flex',flexDirection:'column',alignItems:'center',gap:'10px',cursor:'pointer',transition:'all 0.2s',WebkitTapHighlightColor:'transparent'}}
                  onTouchStart={e=>e.currentTarget.style.background='rgba(255,255,255,0.08)'}
                  onTouchEnd={e=>e.currentTarget.style.background='rgba(255,255,255,0.04)'}>
                  <div style={{width:'44px',height:'44px',borderRadius:'14px',background:`${color}22`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <Icon size={20} color={color}/>
                  </div>
                  <span style={{fontSize:'11px',fontWeight:700,color:'#9ca3af',textAlign:'center',lineHeight:1.3}}>{label}</span>
                </button>
              ))}
            </div>

            {/* STATS */}
            <div className="grid grid-cols-2 gap-3">
              <div style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'20px',padding:'18px'}}>
                <p style={{fontSize:'11px',color:'#6b7280',fontWeight:700,textTransform:'uppercase',letterSpacing:'1px',marginBottom:'6px'}}>Activos</p>
                <p style={{fontSize:'38px',fontWeight:900,fontFamily:"'Outfit',sans-serif",color:'white',lineHeight:1}}>{repairs.filter(r=>r.status!=='entregado').length}</p>
                <p style={{fontSize:'11px',color:'#6b7280',marginTop:'4px'}}>en el taller</p>
              </div>
              <div style={{background:'rgba(249,115,22,0.08)',border:'1px solid rgba(249,115,22,0.15)',borderRadius:'20px',padding:'18px'}}>
                <p style={{fontSize:'11px',color:'#f97316',fontWeight:700,textTransform:'uppercase',letterSpacing:'1px',marginBottom:'6px'}}>Por cobrar</p>
                <p style={{fontSize:'24px',fontWeight:900,fontFamily:"'Outfit',sans-serif",color:'#f97316',lineHeight:1}}>${repairs.filter(r=>r.paymentStatus==='debe').reduce((s,r)=>s+(r.totalCost||0),0).toLocaleString()}</p>
                <p style={{fontSize:'11px',color:'#f97316',opacity:0.6,marginTop:'4px'}}>{repairs.filter(r=>r.paymentStatus==='debe').length} pendientes</p>
              </div>
            </div>

            {/* CHART - ingresos últimos 6 meses */}
            {chartData.some(d=>d.total>0)&&(
              <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'20px',padding:'18px'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
                  <p style={{fontSize:'12px',fontWeight:700,color:'#9ca3af',textTransform:'uppercase',letterSpacing:'1px'}}>Ingresos</p>
                  <p style={{fontSize:'12px',color:'#6b7280'}}>últimos 6 meses</p>
                </div>
                <div style={{display:'flex',alignItems:'flex-end',gap:'6px',height:'72px'}}>
                  {chartData.map((d,i)=>(
                    <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:'4px',height:'100%',justifyContent:'flex-end'}}>
                      {d.total>0&&<p style={{fontSize:'9px',fontWeight:700,color:i===5?'#f97316':'#6b7280'}}>${(d.total/1000).toFixed(0)}k</p>}
                      <div style={{width:'100%',borderRadius:'6px 6px 2px 2px',background:i===5?'linear-gradient(180deg,#f97316,#ea580c)':'rgba(255,255,255,0.08)',height:`${chartMax>0?(d.total/chartMax)*52:4}px`,minHeight:d.total>0?'4px':'2px',transition:'height 0.5s cubic-bezier(.22,1,.36,1)'}}/>
                      <p style={{fontSize:'9px',color:'#4b5563',fontWeight:600}}>{d.month}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SERVICIOS ACTIVOS — compacto */}
            {repairs.filter(r=>r.status!=='entregado').length>0&&(
              <div style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'20px',overflow:'hidden'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'16px 20px 12px'}}>
                  <span style={{fontSize:'12px',fontWeight:700,color:'#6b7280',textTransform:'uppercase',letterSpacing:'1px'}}>En el taller</span>
                  <button onClick={()=>setView('repairs')} style={{fontSize:'12px',color:'#f97316',fontWeight:700,background:'none',border:'none',cursor:'pointer'}}>Ver todos →</button>
                </div>
                {repairs.filter(r=>r.status!=='entregado').slice(0,3).map((rep,i,arr)=>(
                  <div key={rep.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 20px',borderTop:'1px solid rgba(255,255,255,0.05)'}}>
                    <div>
                      <p style={{fontWeight:700,fontSize:'14px',color:'white'}}>{rep.vehicle}</p>
                      <p style={{fontSize:'11px',color:'#6b7280',marginTop:'2px'}}>{rep.orderNumber&&`${rep.orderNumber} · `}{rep.plate||rep.clientName||'—'}</p>
                    </div>
                    <SPill status={rep.status||'pendiente'}/>
                  </div>
                ))}
              </div>
            )}

            {/* ALERTAS — solo si hay stock bajo */}
            {inventory.filter(p=>p.quantity<=p.minStock).length>0&&(
              <button onClick={()=>setView('list')} style={{width:'100%',background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:'16px',padding:'14px 18px',display:'flex',justifyContent:'space-between',alignItems:'center',cursor:'pointer',WebkitTapHighlightColor:'transparent'}}>
                <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                  <AlertCircle size={16} color="#ef4444"/>
                  <span style={{fontSize:'13px',fontWeight:700,color:'#ef4444'}}>{inventory.filter(p=>p.quantity<=p.minStock).length} repuesto{inventory.filter(p=>p.quantity<=p.minStock).length>1?'s':''} con stock bajo</span>
                </div>
                <span style={{fontSize:'12px',color:'#6b7280'}}>Ver →</span>
              </button>
            )}

            {/* ARCA */}
            <div style={{background:'rgba(37,99,235,0.08)',border:'1px solid rgba(37,99,235,0.2)',borderRadius:'16px',padding:'14px 18px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <p style={{fontSize:'13px',fontWeight:700,color:'white'}}>Facturación AFIP</p>
                <p style={{fontSize:'11px',color:'#6b7280',marginTop:'2px'}}>{(tallerConfig.empresas||[])[0]?.cuit||'Configurá tu CUIT'}</p>
              </div>
              <button onClick={()=>window.open('https://www.afip.gob.ar/landing/default.asp','_blank')} style={{background:'linear-gradient(135deg,#2563eb,#1d4ed8)',color:'white',border:'none',borderRadius:'12px',padding:'10px 18px',fontSize:'13px',fontWeight:700,cursor:'pointer',whiteSpace:'nowrap',boxShadow:'0 4px 16px rgba(37,99,235,0.4)'}}>
                🧾 ARCA
              </button>
            </div>

          </div>
        )}

        {/* BÚSQUEDA */}
        {view==='search'&&globalSearch.length>1&&(
          <div className="space-y-4 anim">
            <h2 style={{fontFamily:"'Outfit',sans-serif",fontWeight:900,fontSize:'26px',letterSpacing:'-1px',color:'white'}}>"{globalSearch}"</h2>
            {globalResults?.clients.length>0&&<SSection title="Clientes" dm={dm}>{globalResults.clients.map(c=><div key={c.id} className={`py-2 border-b last:border-0 ${dm?'border-[#30363d]':'border-slate-50'}`}><p className="font-bold text-sm">{c.name}</p><p className="text-xs text-slate-400">{c.phone}</p></div>)}</SSection>}
            {globalResults?.repairs.length>0&&<SSection title="Servicios" dm={dm}>{globalResults.repairs.map(r=><div key={r.id} className={`py-2 border-b last:border-0 ${dm?'border-[#30363d]':'border-slate-50'} flex justify-between items-center`}><div><p className="font-bold text-sm">{r.vehicle} {r.plate}</p><p className="text-xs text-slate-400">{r.clientName}</p></div><SPill status={r.status||'pendiente'}/></div>)}</SSection>}
            {globalResults?.vehicles.length>0&&<SSection title="Vehículos" dm={dm}>{globalResults.vehicles.map(v=><div key={v.id} className={`py-2 border-b last:border-0 ${dm?'border-[#30363d]':'border-slate-50'}`}><p className="font-bold text-sm">🚗 {v.make} {v.model} · <span className="font-mono">{v.plate}</span></p><p className="text-xs text-slate-400">{v.clientName}</p></div>)}</SSection>}
            {globalResults?.inventory.length>0&&<SSection title="Repuestos" dm={dm}>{globalResults.inventory.map(i=><div key={i.id} className={`py-2 border-b last:border-0 ${dm?'border-[#30363d]':'border-slate-50'} flex justify-between`}><p className="font-bold text-sm">{i.name}</p><span className={`text-xs font-bold ${i.quantity<=i.minStock?'text-red-500':'text-emerald-500'}`}>{i.quantity} un.</span></div>)}</SSection>}
            {Object.values(globalResults||{}).every(a=>a.length===0)&&<EC icon={<Search size={36}/>} text="Sin resultados" dm={dm}/>}
          </div>
        )}

        {/* INVENTARIO */}
        {view==='list'&&(
          <div className="space-y-4 anim">
            <div className="flex gap-3 justify-between items-center">
              <h2 style={{fontFamily:"'Outfit',sans-serif",fontWeight:900,fontSize:'26px',letterSpacing:'-1px',color:'white'}}>Inventario</h2>
              <div className="flex gap-2 items-center">
                <ViewToggle mode={listMode} setMode={setListMode} dm={dm}/>
              </div>
            </div>
            {/* FILTER BAR */}
            <div className="flex gap-2 flex-wrap items-center">
              <div className="relative flex-1 min-w-[140px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13}/>
                <input className={`inp pl-9 text-sm ${dm?'bg-[#161b22] border-[#30363d] text-white':'bg-slate-50 border-slate-200'}`} placeholder="Buscar..." value={invFilter.search} onChange={e=>setInvFilter(f=>({...f,search:e.target.value}))}/>
              </div>
              <select className={`inp text-sm flex-shrink-0 ${dm?'bg-[#161b22] border-[#30363d] text-white':'bg-slate-50 border-slate-200'}`} style={{width:'auto'}} value={invFilter.category} onChange={e=>setInvFilter(f=>({...f,category:e.target.value}))}>
                <option value="">Todas las categorías</option>
                {categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select className={`inp text-sm flex-shrink-0 ${dm?'bg-[#161b22] border-[#30363d] text-white':'bg-slate-50 border-slate-200'}`} style={{width:'auto'}} value={invFilter.stock} onChange={e=>setInvFilter(f=>({...f,stock:e.target.value}))}>
                <option value="">Todo el stock</option>
                <option value="low">Stock bajo</option>
                <option value="ok">Stock normal</option>
                <option value="zero">Sin stock</option>
              </select>
              {(invFilter.search||invFilter.category||invFilter.stock)&&<button onClick={()=>setInvFilter({category:'',stock:'',search:''})} className="text-xs font-bold text-orange-500 px-3 py-2 rounded-xl hover:bg-orange-50 transition-colors">✕ Limpiar</button>}
            </div>
            {listMode==='list'?(
              <div className="space-y-2">
                {inventory.filter(p=>{
                const matchSearch = !invFilter.search || p.name.toLowerCase().includes(invFilter.search.toLowerCase());
                const matchCat = !invFilter.category || p.categoryId===invFilter.category;
                const matchStock = !invFilter.stock || (invFilter.stock==='low'&&p.quantity>0&&p.quantity<=p.minStock) || (invFilter.stock==='ok'&&p.quantity>p.minStock) || (invFilter.stock==='zero'&&p.quantity===0);
                return matchSearch&&matchCat&&matchStock;
              }).map(item=>(
                  <div key={item.id} onClick={()=>{setSelectedProduct(item);setView('details');}} style={{background:'#111318',borderRadius:'16px',border:'1px solid rgba(255,255,255,0.06)',display:'flex',alignItems:'center',gap:'12px',padding:'12px',cursor:'pointer',transition:'all 0.2s'}}
                    onTouchStart={e=>e.currentTarget.style.background='#1a1f2a'} onTouchEnd={e=>e.currentTarget.style.background='#111318'}>
                    {/* Thumbnail */}
                    <div style={{width:'48px',height:'48px',borderRadius:'12px',overflow:'hidden',flexShrink:0,background:'rgba(255,255,255,0.05)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                      {item.imageUrl?<img src={item.imageUrl} alt={item.name} style={{width:'48px',height:'48px',objectFit:'cover'}}/>:<Package size={18} color="#4b5563"/>}
                    </div>
                    {/* Info */}
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:'flex',alignItems:'center',gap:'6px',marginBottom:'3px'}}>
                        <p style={{fontWeight:700,fontSize:'14px',color:'white',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{item.name}</p>
                        {item.quantity<=item.minStock&&<span style={{width:'7px',height:'7px',borderRadius:'50%',background:'#ef4444',flexShrink:0}}/>}
                      </div>
                      <div style={{display:'flex',gap:'8px',flexWrap:'wrap',alignItems:'center'}}>
                        {item.categoryId&&categories.find(c=>c.id===item.categoryId)&&<span style={{fontSize:'10px',fontWeight:700,color:'#f97316',background:'rgba(249,115,22,0.1)',padding:'2px 6px',borderRadius:'6px'}}>{categories.find(c=>c.id===item.categoryId).name}</span>}
                        {item.location&&<span style={{fontSize:'11px',color:'#6b7280'}}>📍 {item.location}</span>}
                      </div>
                    </div>
                    {/* Price & Stock */}
                    <div style={{textAlign:'right',flexShrink:0}}>
                      {item.salePrice>0&&<p style={{fontWeight:900,fontSize:'15px',color:'#10b981',fontFamily:"'Outfit',sans-serif"}}>${Number(item.salePrice).toLocaleString()}</p>}
                      <p style={{fontWeight:700,fontSize:item.salePrice>0?'11px':'15px',color:item.salePrice>0?'#6b7280':'white'}}>${Number(item.cost).toLocaleString()}</p>
                      <span style={{fontSize:'10px',fontWeight:700,padding:'2px 8px',borderRadius:'20px',background:item.quantity<=item.minStock?'rgba(239,68,68,0.15)':'rgba(16,185,129,0.15)',color:item.quantity<=item.minStock?'#ef4444':'#10b981'}}>{item.quantity} un.</span>
                    </div>
                    {/* Actions */}
                    <div style={{display:'flex',flexDirection:'column',gap:'4px',flexShrink:0}} onClick={e=>e.stopPropagation()}>
                      <button onClick={()=>{setEditingProduct({...item});setView('edit_product');}} style={{padding:'6px',borderRadius:'10px',background:'rgba(255,255,255,0.05)',border:'none',cursor:'pointer',color:'#9ca3af'}}><Edit3 size={13}/></button>
                      <button onClick={()=>deleteItem('inventory',item.id,item.name)} style={{padding:'6px',borderRadius:'10px',background:'rgba(239,68,68,0.08)',border:'none',cursor:'pointer',color:'#ef4444'}}><Trash2 size={13}/></button>
                    </div>
                  </div>
                ))}
                {inventory.length===0&&<EC icon={<Package size={36}/>} text={configLoaded?"Sin repuestos":"Cargando..."} dm={dm}/>}
              </div>
            ):(
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {inventory.filter(p=>{
                const matchSearch = !invFilter.search || p.name.toLowerCase().includes(invFilter.search.toLowerCase());
                const matchCat = !invFilter.category || p.categoryId===invFilter.category;
                const matchStock = !invFilter.stock || (invFilter.stock==='low'&&p.quantity>0&&p.quantity<=p.minStock) || (invFilter.stock==='ok'&&p.quantity>p.minStock) || (invFilter.stock==='zero'&&p.quantity===0);
                return matchSearch&&matchCat&&matchStock;
              }).map(item=>(
                  <div key={item.id} onClick={()=>{setSelectedProduct(item);setView('details');}} className={`card card-s card-hover cursor-pointer overflow-hidden ${dm?'bg-[#161b22] card-dark':'bg-white'}`}>
                    <div className="p-3 flex items-center gap-2.5">
                      <div className="w-11 h-11 rounded-xl overflow-hidden flex-shrink-0" style={{minWidth:'44px',minHeight:'44px',maxWidth:'44px',maxHeight:'44px'}}>
                        {item.imageUrl
                          ?<img src={item.imageUrl} alt={item.name} style={{width:'44px',height:'44px',objectFit:'cover',display:'block'}}/>
                          :<div className={`w-full h-full flex items-center justify-center ${dm?'bg-[#0d1117]':'bg-slate-100'}`}><Package size={16} className="opacity-30"/></div>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1">
                          <h3 className={`font-bold text-xs leading-tight truncate ${dm?'text-white':'text-slate-900'}`}>{item.name}</h3>
                          {item.quantity<=item.minStock&&<span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0 mt-0.5"/>}
                        </div>
                        {item.categoryId&&categories.find(c=>c.id===item.categoryId)&&<p className="text-[10px] font-bold text-orange-500 truncate">{categories.find(c=>c.id===item.categoryId).name}</p>}
                        <p className={`font-black font-display text-sm leading-tight ${dm?'text-white':'text-slate-900'}`}>${Number(item.cost).toLocaleString()}</p>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${item.quantity<=item.minStock?'bg-red-100 text-red-600':'bg-emerald-100 text-emerald-700'}`}>{item.quantity} un.</span>
                      </div>
                    </div>
                  </div>
                ))}
                {inventory.length===0&&<EC icon={<Package size={36}/>} text={configLoaded?"Sin repuestos":"Cargando..."} dm={dm} className="col-span-2"/>}
              </div>
            )}
          </div>
        )}

        {/* DETALLE REPUESTO */}
        {view==='details'&&selectedProduct&&(
          <div className={`card card-s overflow-hidden max-w-sm mx-auto anim ${dm?'bg-[#161b22]':'bg-white'}`}>
            <div className="p-6 text-white relative" style={{background:'linear-gradient(145deg,#0f172a,#1e293b)'}}>
              <button onClick={()=>setView('list')} className="absolute top-4 left-4 p-1.5 rounded-xl" style={{background:'rgba(255,255,255,0.08)'}}><ChevronLeft size={18} className="text-white"/></button>
              <button onClick={()=>{setEditingProduct({...selectedProduct});setView('edit_product');}} className="absolute top-4 right-12 p-1.5 rounded-xl text-blue-400" style={{background:'rgba(59,130,246,0.15)'}}><Edit3 size={16}/></button>
              <button onClick={()=>deleteItem('inventory',selectedProduct.id,selectedProduct.name)} className="absolute top-4 right-4 p-1.5 rounded-xl text-red-400" style={{background:'rgba(239,68,68,0.12)'}}><Trash2 size={16}/></button>
              {selectedProduct.imageUrl?<img src={selectedProduct.imageUrl} alt="" className="w-full h-32 object-contain rounded-2xl mb-4 mt-6" style={{maxHeight:'128px'}}/>:<div className="w-full h-12 rounded-2xl mb-4 mt-8 flex items-center justify-center" style={{background:'rgba(255,255,255,0.04)'}}><Package size={26} className="text-slate-700"/></div>}
              <h2 className="font-display font-black text-xl uppercase text-center">{selectedProduct.name}</h2>
              <p className="text-orange-400 font-mono text-xs text-center mt-1">{selectedProduct.sku}</p>
              {selectedProduct.description&&<p className="text-slate-400 text-xs text-center mt-1">{selectedProduct.description}</p>}
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <div className={`rounded-2xl p-3 text-center ${dm?'bg-[#0d1117]':'bg-slate-50'}`}><p className={`text-3xl font-black font-display ${selectedProduct.quantity<=selectedProduct.minStock?'text-red-500':''}`}>{selectedProduct.quantity}</p><p className="text-xs font-bold text-slate-400 uppercase mt-1">Stock</p></div>
                <div className={`rounded-2xl p-3 text-center ${dm?'bg-[#0d1117]':'bg-slate-50'}`}><p className="text-xl font-black font-display text-emerald-400">${Number(selectedProduct.salePrice||selectedProduct.cost).toLocaleString()}</p><p className="text-xs font-bold text-slate-400 uppercase mt-1">Venta</p></div>
                <div className={`rounded-2xl p-3 text-center ${dm?'bg-[#0d1117]':'bg-slate-50'}`}><p className="text-xl font-black font-display text-slate-400">${Number(selectedProduct.cost).toLocaleString()}</p><p className="text-xs font-bold text-slate-400 uppercase mt-1">Costo</p></div>
              </div>
              {selectedProduct.supplier&&<div className={`rounded-2xl p-3 text-sm ${dm?'bg-[#0d1117]':'bg-slate-50'}`}><p className="font-bold">🏪 {selectedProduct.supplier}</p>{selectedProduct.supplierPhone&&<p className={`text-xs mt-0.5 ${dm?'text-slate-400':'text-slate-500'}`}>📞 {selectedProduct.supplierPhone}</p>}</div>}
              <div className={`flex items-center justify-between gap-3 rounded-2xl p-3 ${dm?'bg-[#0d1117]':'bg-slate-50'}`}>
                <button onClick={()=>updateStock(selectedProduct.id,-1)} className={`p-2.5 rounded-xl shadow-sm ${dm?'bg-[#161b22]':'bg-white'}`}><MinusCircle className="text-red-400" size={20}/></button>
                <span className="font-bold text-sm">Ajustar stock</span>
                <button onClick={()=>updateStock(selectedProduct.id,1)} className={`p-2.5 rounded-xl shadow-sm ${dm?'bg-[#161b22]':'bg-white'}`}><PlusCircle className="text-emerald-500" size={20}/></button>
              </div>
              <div className="text-center pt-3 border-t" style={{borderColor:dm?'#30363d':'#f1f5f9'}}>
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${selectedProduct.sku}&bgcolor=${dm?'161b22':'ffffff'}&color=${dm?'ffffff':'000000'}`} className="w-28 h-28 mx-auto rounded-2xl border p-1" style={{borderColor:dm?'#30363d':'#e2e8f0'}} alt="QR"/>
                <button onClick={()=>printQRLabel(selectedProduct)} className={`btn-ghost mt-3 mx-auto ${dm?'border-[#30363d] text-slate-300':'border-slate-200 text-slate-600'}`} style={{width:'auto'}}><Printer size={15}/>Imprimir etiqueta</button>
              </div>
            </div>
          </div>
        )}

        {/* SERVICIOS */}
        {view==='repairs'&&(
          <div className="space-y-4 anim">
            <div className="flex justify-between items-center">
              <h2 style={{fontFamily:"'Outfit',sans-serif",fontWeight:900,fontSize:'26px',letterSpacing:'-1px',color:'white'}}>Servicios</h2>
              <ViewToggle mode={listMode} setMode={setListMode} dm={dm}/>
            </div>
            <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
              {Object.entries(STATUS_CONFIG).map(([key,cfg])=>(
                <span key={key} style={{padding:'4px 12px',borderRadius:'20px',fontSize:'11px',fontWeight:700,display:'inline-flex',alignItems:'center',gap:'5px',background:'rgba(255,255,255,0.05)',color:'#9ca3af',border:'1px solid rgba(255,255,255,0.08)'}}>
                  {cfg.icon} {cfg.label} <span style={{color:'#f97316'}}>({repairs.filter(r=>(r.status||'pendiente')===key).length})</span>
                </span>
              ))}
            </div>
            {listMode==='grid'&&(
              <div className="grid grid-cols-2 gap-3">
                {[...repairs].sort((a,b)=>(b.date?.seconds||0)-(a.date?.seconds||0)).map(rep=>(
                  <div key={rep.id} style={{background:'#111318',borderRadius:'18px',padding:'16px',border:'1px solid rgba(255,255,255,0.06)',borderLeft:`3px solid ${rep.paymentStatus==='pagado'?'#10b981':rep.paymentStatus==='señado'?'#f59e0b':'#ef4444'}`}}>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {rep.orderNumber&&<span className="text-[10px] font-bold text-orange-500 font-mono">{rep.orderNumber}</span>}
                      <SPill status={rep.status||'pendiente'}/>
                    </div>
                    <p style={{fontWeight:800,fontSize:'14px',color:'white',marginBottom:'2px'}}>{rep.vehicle}</p>
                    {rep.plate&&<span style={{fontFamily:'monospace',fontSize:'11px',color:'#6b7280'}}>{rep.plate}</span>}
                    {rep.clientName&&<p style={{fontSize:'11px',color:'#6b7280',marginTop:'2px'}}>{rep.clientName}</p>}
                    <p style={{fontWeight:900,color:'#10b981',fontSize:'16px',marginTop:'4px'}}>${(rep.totalCost||0).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            )}
            {listMode==='list'&&(
            <div className="space-y-4">
            {[...repairs].sort((a,b)=>(b.date?.seconds||0)-(a.date?.seconds||0)).map(rep=>(
              <div key={rep.id} style={{background:'#111318',borderRadius:'20px',overflow:'hidden',border:'1px solid rgba(255,255,255,0.06)'}}>
                <div style={{height:'3px',background:rep.paymentStatus==='pagado'?'#10b981':rep.paymentStatus==='señado'?'#f59e0b':'#ef4444'}}/>
                {rep.imageUrl&&<img src={rep.imageUrl} alt="" style={{width:'100%',height:'160px',objectFit:'cover'}}/>}
                <div style={{padding:'16px'}}>
                  {/* Header */}
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'10px'}}>
                    <div style={{flex:1,minWidth:0,marginRight:'12px'}}>
                      <div style={{display:'flex',alignItems:'center',gap:'6px',marginBottom:'5px',flexWrap:'wrap'}}>
                        {rep.orderNumber&&<span style={{fontSize:'10px',fontWeight:700,color:'#f97316',fontFamily:'monospace',background:'rgba(249,115,22,0.1)',padding:'2px 7px',borderRadius:'7px'}}>{rep.orderNumber}</span>}
                        <SPill status={rep.status||'pendiente'}/>
                        <PayBadge status={rep.paymentStatus||'debe'}/>
                      </div>
                      <p style={{fontWeight:800,fontSize:'16px',color:'white',marginBottom:'3px'}}>{rep.vehicle}</p>
                      <div style={{display:'flex',gap:'10px',flexWrap:'wrap'}}>
                        {rep.plate&&<span style={{fontSize:'11px',color:'#6b7280',fontFamily:'monospace'}}>{rep.plate}</span>}
                        {rep.km&&<span style={{fontSize:'11px',color:'#6b7280'}}>🔢 {Number(rep.km).toLocaleString()} km</span>}
                        {rep.clientName&&<span style={{fontSize:'11px',color:'#6b7280'}}>👤 {rep.clientName}</span>}
                        {rep.date?.seconds&&<span style={{fontSize:'11px',color:'#6b7280'}}>📅 {new Date(rep.date.seconds*1000).toLocaleDateString('es-AR')}</span>}
                      </div>
                    </div>
                    <div style={{textAlign:'right',flexShrink:0}}>
                      <p style={{fontWeight:900,fontSize:'22px',color:'#10b981',fontFamily:"'Outfit',sans-serif",lineHeight:1}}>${(rep.totalCost||0).toLocaleString()}</p>
                      {(()=>{const paid=(rep.payments||[]).reduce((s,p)=>s+p.amount,0);return paid>0?<p style={{fontSize:'11px',color:'#f97316',fontWeight:700,marginTop:'2px'}}>Pagó ${paid.toLocaleString()}</p>:null;})()}
                      {(()=>{const g=(rep.totalCost||0)-(rep.partsUsed||[]).reduce((s,p)=>s+(p.costOriginal||p.cost)*p.qty,0);return g>0?<p style={{fontSize:'11px',color:'#3b82f6',fontWeight:700}}>Gan ${g.toLocaleString()}</p>:null;})()}
                    </div>
                  </div>
                  {/* Description */}
                  {rep.description&&<p style={{fontSize:'13px',color:'#9ca3af',marginBottom:'10px',fontStyle:'italic',lineHeight:1.5}}>{rep.description}</p>}
                  {rep.notes&&<div style={{fontSize:'12px',background:'rgba(245,158,11,0.08)',color:'#fbbf24',padding:'8px 12px',borderRadius:'10px',marginBottom:'10px'}}>📝 {rep.notes}</div>}
                  {/* Parts */}
                  {rep.partsUsed?.length>0&&<div style={{display:'flex',flexWrap:'wrap',gap:'4px',marginBottom:'12px'}}>{rep.partsUsed.map((p,i)=><span key={i} style={{fontSize:'10px',fontWeight:700,color:'#9ca3af',background:'rgba(255,255,255,0.05)',padding:'3px 8px',borderRadius:'8px'}}>{p.qty}× {p.name}</span>)}</div>}
                  {/* Status */}
                  <div style={{display:'flex',gap:'4px',flexWrap:'wrap',marginBottom:'10px'}}>
                    {Object.keys(STATUS_CONFIG).map(s=><button key={s} onClick={()=>updateRepairField(rep.id,'status',s)} style={{fontSize:'10px',fontWeight:700,padding:'5px 10px',borderRadius:'10px',border:'none',cursor:'pointer',background:(rep.status||'pendiente')===s?'#f97316':'rgba(255,255,255,0.05)',color:(rep.status||'pendiente')===s?'white':'#6b7280',transition:'all 0.15s'}}>{STATUS_CONFIG[s].icon} {STATUS_CONFIG[s].label}</button>)}
                    {Object.entries(PAYMENT_CONFIG).map(([key,cfg])=><button key={key} onClick={()=>updateRepairField(rep.id,'paymentStatus',key)} style={{fontSize:'10px',fontWeight:700,padding:'5px 10px',borderRadius:'10px',cursor:'pointer',background:(rep.paymentStatus||'debe')===key?cfg.bg:'rgba(255,255,255,0.05)',color:(rep.paymentStatus||'debe')===key?cfg.color:'#6b7280',border:`1px solid ${(rep.paymentStatus||'debe')===key?cfg.color:'transparent'}`,transition:'all 0.15s'}}>{cfg.icon} {cfg.label}</button>)}
                  </div>
                  {/* Actions */}
                  <div style={{display:'flex',gap:'6px',flexWrap:'wrap',borderTop:'1px solid rgba(255,255,255,0.05)',paddingTop:'10px'}}>
                    <button onClick={()=>{setEditingRepair({...rep});setClientSearch(rep.clientName||'');setView('edit_repair');}} style={{display:'flex',alignItems:'center',gap:'5px',fontSize:'12px',fontWeight:700,padding:'8px 14px',borderRadius:'12px',background:'rgba(255,255,255,0.06)',color:'#e2e8f0',border:'none',cursor:'pointer'}}><Edit3 size={12}/>Editar</button>
                    <button onClick={()=>{setShowPaymentModal(rep.id);setPaymentAmount('');}} style={{display:'flex',alignItems:'center',gap:'5px',fontSize:'12px',fontWeight:700,padding:'8px 14px',borderRadius:'12px',background:'rgba(16,185,129,0.1)',color:'#10b981',border:'none',cursor:'pointer'}}><DollarSign size={12}/>Pago</button>
                    {(rep.status==='listo'||rep.status==='entregado')&&<button onClick={()=>openConvertToBudget(rep)} style={{display:'flex',alignItems:'center',gap:'5px',fontSize:'12px',fontWeight:700,padding:'8px 14px',borderRadius:'12px',background:'rgba(59,130,246,0.1)',color:'#3b82f6',border:'none',cursor:'pointer'}}><FileText size={12}/>Pres.</button>}
                    <button onClick={()=>printWorkOrder(rep)} style={{display:'flex',alignItems:'center',gap:'5px',fontSize:'12px',fontWeight:700,padding:'8px 14px',borderRadius:'12px',background:'rgba(255,255,255,0.05)',color:'#9ca3af',border:'none',cursor:'pointer'}}><Printer size={12}/>OT</button>
                    <button onClick={()=>deleteItem('repairs',rep.id,`${rep.vehicle}`)} style={{marginLeft:'auto',padding:'8px 10px',borderRadius:'12px',background:'rgba(239,68,68,0.08)',color:'#ef4444',border:'none',cursor:'pointer'}}><Trash2 size={13}/></button>
                  </div>
                </div>
              </div>
            ))}
            {repairs.length===0&&<EC icon={<Car size={36}/>} text="No hay servicios" dm={dm}/>}
            </div>
            )}
          </div>
        )}

        {/* PRESUPUESTOS */}
        {view==='budgets'&&(
          <div className="space-y-4 anim">
            <div className="flex justify-between items-center">
              <h2 style={{fontFamily:"'Outfit',sans-serif",fontWeight:900,fontSize:'26px',letterSpacing:'-1px',color:'white'}}>Presupuestos</h2>
              <ViewToggle mode={listMode} setMode={setListMode} dm={dm}/>
            </div>
            {listMode==='grid'&&(
              <div className="grid grid-cols-2 gap-3">
                {[...budgets].sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0)).map(budget=>{
                  const emp2=(tallerConfig.empresas||[]).find(e=>e.id===budget.empresaId)||tallerConfig.empresas?.[0];
                  return (
                    <div key={budget.id} style={{background:'#111318',borderRadius:'16px',padding:'14px',border:'1px solid rgba(59,130,246,0.15)',borderTop:'3px solid #3b82f6'}}>
                      {budget.budgetNumber&&<span style={{fontSize:'10px',fontWeight:700,color:'#3b82f6',fontFamily:'monospace',display:'block',marginBottom:'4px'}}>#{budget.budgetNumber}</span>}
                      <p style={{fontWeight:700,fontSize:'14px',color:'white',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{budget.clientName||'—'}</p>
                      <p style={{fontSize:'11px',color:'#6b7280',marginTop:'2px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{budget.vehicle}</p>
                      <p style={{fontSize:'11px',color:'#4b5563',marginTop:'4px'}}>📅 {budget.date?new Date(budget.date+'T12:00:00').toLocaleDateString('es-AR'):'—'}</p>
                      <p style={{fontWeight:900,fontSize:'18px',color:'#3b82f6',fontFamily:"'Outfit',sans-serif",marginTop:'6px'}}>${(budget.totalCost||0).toLocaleString()}</p>
                    </div>
                  );
                })}
              </div>
            )}
            {listMode==='list'&&[...budgets].sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0)).map(budget=>{
              const emp=(tallerConfig.empresas||[]).find(e=>e.id===budget.empresaId)||tallerConfig.empresas?.[0];
              return (
                <div key={budget.id} style={{background:'#111318',borderRadius:'20px',overflow:'hidden',border:'1px solid rgba(255,255,255,0.06)'}}>
                  <div style={{height:'3px',background:'linear-gradient(90deg,#3b82f6,#6366f1)'}}/>
                  <div style={{padding:'16px'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'10px'}}>
                      <div style={{flex:1,minWidth:0,marginRight:'12px'}}>
                        <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'4px'}}>
                          {budget.budgetNumber&&<span style={{fontSize:'10px',fontWeight:700,color:'#3b82f6',fontFamily:'monospace',background:'rgba(59,130,246,0.1)',padding:'2px 8px',borderRadius:'7px'}}>#{budget.budgetNumber}</span>}
                          <p style={{fontWeight:800,fontSize:'15px',color:'white'}}>{budget.clientName||'—'}</p>
                        </div>
                        <p style={{fontSize:'13px',color:'#9ca3af',marginBottom:'3px'}}>{budget.vehicle}{budget.plate&&` · ${budget.plate}`}</p>
                        <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
                          <span style={{fontSize:'11px',color:'#6b7280'}}>📅 {budget.date?new Date(budget.date+'T12:00:00').toLocaleDateString('es-AR'):'—'}</span>
                          {emp&&<span style={{fontSize:'10px',fontWeight:700,color:'#3b82f6',background:'rgba(59,130,246,0.08)',padding:'2px 8px',borderRadius:'8px'}}>🏢 {emp.nombre}</span>}
                        </div>
                      </div>
                      <p style={{fontWeight:900,fontSize:'22px',color:'#3b82f6',fontFamily:"'Outfit',sans-serif",flexShrink:0}}>${(budget.totalCost||0).toLocaleString()}</p>
                    </div>
                    <div style={{display:'flex',gap:'6px',flexWrap:'wrap',borderTop:'1px solid rgba(255,255,255,0.05)',paddingTop:'10px'}}>
                      <button onClick={()=>sendWhatsApp(budget)} style={{display:'flex',alignItems:'center',gap:'5px',fontSize:'12px',fontWeight:700,padding:'8px 14px',borderRadius:'12px',background:'rgba(34,197,94,0.1)',color:'#22c55e',border:'none',cursor:'pointer'}}><MessageCircle size={12}/>WhatsApp</button>
                      <button onClick={()=>printBudget(budget)} style={{display:'flex',alignItems:'center',gap:'5px',fontSize:'12px',fontWeight:700,padding:'8px 14px',borderRadius:'12px',background:'rgba(255,255,255,0.06)',color:'#e2e8f0',border:'none',cursor:'pointer'}}><Printer size={12}/>Imprimir</button>
                      <button onClick={()=>{setEditingBudget({...budget});setClientSearchB(budget.clientName||'');setView('edit_budget');}} style={{display:'flex',alignItems:'center',gap:'5px',fontSize:'12px',fontWeight:700,padding:'8px 12px',borderRadius:'12px',background:'rgba(255,255,255,0.05)',color:'#9ca3af',border:'none',cursor:'pointer'}}><Edit3 size={12}/></button>
                      <button onClick={()=>deleteItem('budgets',budget.id,budget.clientName)} style={{marginLeft:'auto',padding:'8px 10px',borderRadius:'12px',background:'rgba(239,68,68,0.08)',color:'#ef4444',border:'none',cursor:'pointer'}}><Trash2 size={13}/></button>
                    </div>
                  </div>
                </div>
              );
            })}
            {budgets.length===0&&<EC icon={<FileText size={36}/>} text="No hay presupuestos" dm={dm}/>}
          </div>
        )}

        {/* CLIENTES */}
        {view==='clients'&&(
          <div className="space-y-4 anim">
            <div className="flex justify-between items-center">
              <h2 style={{fontFamily:"'Outfit',sans-serif",fontWeight:900,fontSize:'26px',letterSpacing:'-1px',color:'white'}}>Clientes</h2>
              <ViewToggle mode={listMode} setMode={setListMode} dm={dm}/>
            </div>
            {listMode==='grid'&&(
              <div className="grid grid-cols-2 gap-3">
                {clients.map(c2=>(
                  <div key={c2.id} style={{background:'#111318',borderRadius:'18px',padding:'16px',border:'1px solid rgba(255,255,255,0.06)'}} style={{borderLeft:'3px solid #8b5cf6'}}>
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-black text-sm mb-2" style={{background:'linear-gradient(135deg,#8b5cf6,#7c3aed)'}}>{c2.name?.[0]}</div>
                    <h4 className={`font-bold text-sm truncate ${dm?'text-white':'text-slate-900'}`}>{c2.name}</h4>
                    {c2.phone&&<p className="text-xs text-slate-400">{c2.phone}</p>}
                    <p className="text-xs text-slate-400 mt-0.5">{getClientVehicles(c2.id).length} vehículo(s)</p>
                  </div>
                ))}
              </div>
            )}
            {listMode==='list'&&clients.map(client=>(
              <div key={client.id} style={{background:'#111318',borderRadius:'18px',padding:'20px',border:'1px solid rgba(255,255,255,0.06)'}} style={{borderLeft:'3px solid #8b5cf6'}}>
                <div className="flex justify-between items-start mb-2">
                  <div><h4 className={`font-bold ${dm?'text-white':'text-slate-900'}`}>{client.name}</h4>{client.phone&&<p className={`text-sm mt-0.5 ${dm?'text-slate-400':'text-slate-500'}`}>📞 {client.phone}</p>}{client.email&&<p className={`text-xs ${dm?'text-slate-500':'text-slate-400'}`}>{client.email}</p>}</div>
                  <div className="flex gap-2">
                    <button onClick={()=>{setEditingClient({...client});setView('edit_client');}} className="p-2 text-blue-400 rounded-xl"><Edit3 size={14}/></button>
                    <button onClick={()=>deleteItem('clients',client.id,client.name)} className="p-2 text-red-400 rounded-xl"><Trash2 size={14}/></button>
                  </div>
                </div>
                {getClientVehicles(client.id).length>0&&(
                  <div className="flex flex-wrap gap-2 mt-2">
                    {getClientVehicles(client.id).map(v=>(
                      <div key={v.id} className={`rounded-xl px-3 py-2 text-xs border ${dm?'bg-[#0d1117] border-[#30363d]':'bg-slate-50 border-slate-200'}`}>
                        <p className="font-bold">🚗 {v.make} {v.model} {v.year}</p>
                        {v.plate&&<p className={`font-mono mt-0.5 ${dm?'text-slate-500':'text-slate-400'}`}>{v.plate}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {clients.length===0&&<EC icon={<Users size={36}/>} text="No hay clientes" dm={dm}/>}
          </div>
        )}

        {/* VEHÍCULOS */}
        {view==='vehicles_list'&&(
          <div className="space-y-4 anim">
            <div className="flex justify-between items-center">
              <h2 style={{fontFamily:"'Outfit',sans-serif",fontWeight:900,fontSize:'26px',letterSpacing:'-1px',color:'white'}}>Vehículos</h2>
              <ViewToggle mode={listMode} setMode={setListMode} dm={dm}/>
            </div>
            {/* Search bar */}
            <div style={{position:'relative'}}>
              <Search style={{position:'absolute',left:'12px',top:'50%',transform:'translateY(-50%)',color:'#6b7280'}} size={15}/>
              <input
                style={{width:'100%',paddingLeft:'38px',paddingRight:'14px',paddingTop:'10px',paddingBottom:'10px',borderRadius:'12px',background:'rgba(255,255,255,0.05)',border:'1.5px solid rgba(255,255,255,0.08)',color:'white',outline:'none',fontSize:'14px',fontFamily:"'Space Grotesk',sans-serif"}}
                placeholder="Buscar por patente, marca, modelo o cliente..."
                value={searchTerm}
                onChange={e=>setSearchTerm(e.target.value)}
                onFocus={e=>e.target.style.borderColor='#f97316'}
                onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.08)'}
              />
            </div>
            {vehicles.filter(v=>{
              if(!searchTerm) return true;
              const q=searchTerm.toLowerCase();
              return v.plate?.toLowerCase().includes(q)||v.make?.toLowerCase().includes(q)||v.model?.toLowerCase().includes(q)||v.clientName?.toLowerCase().includes(q)||v.year?.includes(q);
            }).map(v=>(
              <div key={v.id} className={`card card-s p-5 flex justify-between items-start ${dm?'bg-[#161b22] card-dark':'bg-white'}`} style={{borderLeft:'3px solid #14b8a6'}}>
                <div>
                  <p className="font-bold">🚗 {v.make} {v.model} {v.year}</p>
                  {v.plate&&<p className={`font-mono text-sm mt-0.5 ${dm?'text-slate-400':'text-slate-500'}`}>{v.plate}</p>}
                  {v.km&&<p className="text-xs text-slate-400">🔢 {Number(v.km).toLocaleString()} km</p>}
                  {v.clientName&&<p className="text-xs text-orange-500 font-bold mt-1 flex items-center gap-1"><Users size={10}/>{v.clientName}</p>}
                </div>
                <div className="flex gap-2">
                  <button onClick={()=>{setEditingVehicle({...v});setView('edit_vehicle');}} className="p-2 text-blue-400 rounded-xl"><Edit3 size={14}/></button>
                  <button onClick={()=>deleteItem('vehicles',v.id,`${v.make} ${v.model}`)} className="p-2 text-red-400 rounded-xl"><Trash2 size={14}/></button>
                </div>
              </div>
            ))}
            {vehicles.filter(v=>{if(!searchTerm)return true;const q=searchTerm.toLowerCase();return v.plate?.toLowerCase().includes(q)||v.make?.toLowerCase().includes(q)||v.model?.toLowerCase().includes(q)||v.clientName?.toLowerCase().includes(q)||v.year?.includes(q);}).length===0&&<EC icon={<Car size={36}/>} text="No hay vehículos" dm={dm}/>}
          </div>
        )}

        {/* HISTORIAL */}
        {view==='history'&&(
          <div className="space-y-4 anim">
            <h2 className={`page-title font-display ${dm?'text-white':'text-slate-900'}`}>Historial Vehículo</h2>
            <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15}/><input className={`inp pl-9 ${dm?'bg-[#161b22] border-[#30363d] text-white':'bg-slate-50 border-slate-200'}`} placeholder="Patente o modelo..." value={vehicleFilter} onChange={e=>setVehicleFilter(e.target.value)}/></div>
            {vehicleFilter&&vehicleHistory.length===0&&<div className={`card card-s p-8 text-center text-sm ${dm?'bg-[#161b22] text-slate-500':'bg-white text-slate-400'}`}>Sin registros para "{vehicleFilter}"</div>}
            {[...vehicleHistory].sort((a,b)=>(b.date?.seconds||0)-(a.date?.seconds||0)).map(rep=>(
              <div key={rep.id} style={{background:'#111318',borderRadius:'18px',padding:'20px',border:'1px solid rgba(255,255,255,0.06)'}} style={{borderLeft:`3px solid ${rep.paymentStatus==='pagado'?'#10b981':rep.paymentStatus==='señado'?'#f59e0b':'#ef4444'}`}}>
                <div className="flex justify-between items-start mb-1">
                  <div><h4 className={`font-bold ${dm?'text-white':'text-slate-900'}`}>{rep.vehicle} <span className="font-mono text-sm text-slate-400">{rep.plate}</span></h4>
                    <div className={`flex gap-3 text-xs mt-0.5 ${dm?'text-slate-500':'text-slate-400'}`}>{rep.km&&<span>🔢 {Number(rep.km).toLocaleString()} km</span>}{rep.date?.seconds&&<span>📅 {new Date(rep.date.seconds*1000).toLocaleDateString('es-AR')}</span>}</div></div>
                  <p className="font-black text-emerald-500 font-display">${rep.totalCost?.toLocaleString()}</p>
                </div>
                <p className={`text-sm ${dm?'text-slate-400':'text-slate-600'}`}>{rep.description}</p>
              </div>
            ))}
            {!vehicleFilter&&<EC icon={<Clock size={36}/>} text="Escribí una patente para ver el historial" dm={dm}/>}
          </div>
        )}

        {/* MOV. STOCK */}
        {view==='stock_history'&&(
          <div className="space-y-4 anim">
            <div className="flex justify-between items-center">
              <h2 style={{fontFamily:"'Outfit',sans-serif",fontWeight:900,fontSize:'26px',letterSpacing:'-1px',color:'white'}}>Movimientos</h2>
              <DangerBtn onClick={()=>deleteAll('stock_history')}/>
            </div>
            <div className={`card card-s overflow-hidden ${dm?'bg-[#161b22]':'bg-white'}`}>
              {stockHistory.sort((a,b)=>(b.date?.seconds||0)-(a.date?.seconds||0)).slice(0,60).map(h=>(
                <div key={h.id} className={`flex items-center justify-between px-5 py-3 border-b last:border-0 ${dm?'border-[#30363d]':'border-slate-50'}`}>
                  <div>
                    <p className="font-bold text-sm">{h.productName}</p>
                    <p className={`text-xs ${dm?'text-slate-500':'text-slate-400'}`}>{h.reason} · {h.user||'Sistema'} · {h.date?.seconds?new Date(h.date.seconds*1000).toLocaleDateString('es-AR'):'—'}</p>
                  </div>
                  <span className={`font-black text-base font-display ${h.delta>0?'text-emerald-500':'text-red-500'}`}>{h.delta>0?'+':''}{h.delta}</span>
                </div>
              ))}
              {stockHistory.length===0&&<div className={`p-16 text-center ${dm?'text-slate-500':'text-slate-400'}`}><History size={36} className="mx-auto mb-3 opacity-20"/><p>Sin movimientos</p></div>}
            </div>
          </div>
        )}

        {/* ESTADÍSTICAS */}
        {view==='stats'&&(
          <div className="space-y-5 anim">
            <div className="flex justify-between items-center">
              <h2 className={`page-title font-display ${dm?'text-white':'text-slate-900'}`}>Estadísticas</h2>
              <select className={`inp text-sm ${dm?'bg-[#161b22] border-[#30363d] text-white':'bg-slate-50 border-slate-200'}`} style={{width:'auto',padding:'8px 12px'}} value={statsMonth} onChange={e=>setStatsMonth(Number(e.target.value))}>
                {MONTHS.map((m,i)=><option key={i} value={i}>{m}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                {label:'Ingresos del mes',value:`$${monthRevenue.toLocaleString()}`,from:'#10b981',to:'#059669',Icon:DollarSign},
                {label:'Servicios del mes',value:monthRepairs.length,from:'#3b82f6',to:'#2563eb',Icon:Car},
                {label:'Total repuestos',value:inventory.length,from:'#f97316',to:'#ea580c',Icon:Package},
                {label:'Valor inventario',value:`$${inventory.reduce((s,p)=>s+(p.cost*p.quantity),0).toLocaleString()}`,from:'#ef4444',to:'#dc2626',Icon:TrendingUp},
                {label:'Clientes',value:clients.length,from:'#06b6d4',to:'#0891b2',Icon:Users},
                {label:'Por cobrar',value:`$${repairs.filter(r=>r.paymentStatus==='debe').reduce((s,r)=>s+(r.totalCost||0),0).toLocaleString()}`,from:'#f59e0b',to:'#d97706',Icon:CreditCard},
              ].map(({label,value,from,to,Icon})=>(
                <div key={label} className="g-card text-white" style={{background:`linear-gradient(135deg,${from},${to})`}}>
                  <Icon size={17} className="opacity-70 mb-2"/><p className="text-2xl font-black font-display">{value}</p><p className="text-xs font-semibold opacity-70 uppercase tracking-wide mt-0.5">{label}</p>
                </div>
              ))}
            </div>
            <div style={{background:'#111318',borderRadius:'18px',padding:'20px',border:'1px solid rgba(255,255,255,0.06)'}}>
              <p className={`font-display font-bold mb-4 text-sm ${dm?'text-white':'text-slate-800'}`}>Ingresos últimos 6 meses</p>
              <div className="flex items-end gap-2 h-32">
                {chartData.map((d,i)=>(
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    {d.total>0&&<p className="text-[10px] font-bold text-orange-500">${(d.total/1000).toFixed(0)}k</p>}
                    <div className="w-full rounded-t-xl" style={{height:`${(d.total/chartMax)*90}px`,minHeight:d.total>0?'4px':'0',background:i===5?'linear-gradient(180deg,#f97316,#ea580c)':dm?'#21262d':'#e2e8f0',transition:'height 0.5s'}}/>
                    <p className={`text-[10px] font-bold ${dm?'text-slate-600':'text-slate-400'}`}>{d.month}</p>
                  </div>
                ))}
              </div>
            </div>
            {topServices.length>0&&(
              <div style={{background:'#111318',borderRadius:'18px',padding:'20px',border:'1px solid rgba(255,255,255,0.06)'}}>
                <p className="font-display font-bold mb-3 text-sm flex items-center gap-2"><Award size={15} className="text-orange-500"/>Servicios más frecuentes</p>
                {topServices.map(([name,count],i)=>(
                  <div key={i} className={`flex items-center gap-3 py-2 border-b last:border-0 ${dm?'border-[#30363d]':'border-slate-50'}`}>
                    <span className="text-lg font-black text-orange-500 w-6">{i+1}</span>
                    <span className="flex-1 text-sm font-bold truncate">{name}</span>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${dm?'bg-[#0d1117] text-slate-400':'bg-slate-100 text-slate-600'}`}>{count}x</span>
                  </div>
                ))}
              </div>
            )}
            {topParts.length>0&&(
              <div style={{background:'#111318',borderRadius:'18px',padding:'20px',border:'1px solid rgba(255,255,255,0.06)'}}>
                <p className={`font-display font-bold mb-3 text-sm flex items-center gap-2 ${dm?'text-white':'text-slate-800'}`}><Package size={15} className="text-orange-500"/>Repuestos más usados</p>
                {topParts.map(([name,qty],i)=>(
                  <div key={i} className={`flex items-center gap-3 py-2 border-b last:border-0 ${dm?'border-[#30363d]':'border-slate-50'}`}>
                    <span className="text-lg font-black text-blue-500 w-6">{i+1}</span>
                    <span className="flex-1 text-sm font-bold truncate">{name}</span>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${dm?'bg-[#0d1117] text-slate-400':'bg-slate-100 text-slate-600'}`}>{qty} un.</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* CONFIGURACIÓN */}
        {view==='config'&&(
          <div className="space-y-5 anim max-w-lg mx-auto">
            <h2 className={`page-title font-display ${dm?'text-white':'text-slate-900'}`}>Configuración</h2>
            {/* Taller data */}
            <div className={`card card-s p-6 space-y-4 ${dm?'bg-[#161b22] card-dark':'bg-white'}`}>
              <p className={`font-bold text-sm flex items-center gap-2 ${dm?'text-white':'text-slate-800'}`}><Settings size={15} className="text-orange-500"/>Datos del taller</p>
              {editConfig?(
                <>
                  {[['nombre','Nombre'],['direccion','Dirección'],['telefono','Teléfono'],['email','Email']].map(([f,l])=>(
                    <div key={f}><span className="lbl">{l}</span><input className={`inp ${dm?'bg-[#0d1117] border-[#30363d] text-white':'bg-slate-50 border-slate-200'}`} value={editConfig[f]||''} onChange={e=>setEditConfig(c=>({...c,[f]:e.target.value}))}/></div>
                  ))}
                  <div className="flex gap-3">
                    <button onClick={()=>setEditConfig(null)} className={`btn-ghost flex-1 ${dm?'border-[#30363d] text-slate-300':'border-slate-200 text-slate-600'}`}>Cancelar</button>
                    <button onClick={saveConfig} className="btn-primary flex-1"><Save size={15}/>Guardar</button>
                  </div>
                </>
              ):(
                <>
                  <div className={`rounded-2xl p-4 space-y-1.5 ${dm?'bg-[#0d1117]':'bg-slate-50'}`}>
                    <p className={`font-black ${dm?'text-white':'text-slate-900'}`}>{tallerConfig.nombre}</p>
                    <p className={`text-sm ${dm?'text-slate-400':'text-slate-500'}`}>📍 {tallerConfig.direccion}</p>
                    <p className={`text-sm ${dm?'text-slate-400':'text-slate-500'}`}>📞 {tallerConfig.telefono}</p>
                    <p className={`text-sm ${dm?'text-slate-400':'text-slate-500'}`}>✉️ {tallerConfig.email}</p>
                  </div>
                  <button onClick={()=>setEditConfig({...tallerConfig})} className="btn-primary"><Edit3 size={15}/>Editar datos</button>
                </>
              )}
            </div>

            {/* Empresas de facturación */}
            <div className={`card card-s p-6 space-y-4 ${dm?'bg-[#161b22] card-dark':'bg-white'}`}>
              <p className={`font-bold text-sm flex items-center gap-2 ${dm?'text-white':'text-slate-800'}`}><Building2 size={15} className="text-blue-500"/>Empresas de facturación</p>
              {(tallerConfig.empresas||[]).map((emp,i)=>(
                <div key={emp.id} className={`rounded-2xl p-4 border ${dm?'bg-[#0d1117] border-[#30363d]':'bg-slate-50 border-slate-200'}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className={`font-bold ${dm?'text-white':'text-slate-900'}`}>{emp.nombre}</p>
                      {emp.cuit&&<p className={`text-xs ${dm?'text-slate-400':'text-slate-500'}`}>CUIT: {emp.cuit}</p>}
                      <p className={`text-xs ${dm?'text-slate-500':'text-slate-400'}`}>{emp.telefono} · {emp.email}</p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={()=>{
                        const updated={...tallerConfig,empresas:(tallerConfig.empresas||[]).map((e,j)=>j===i?{...e,_editing:true}:e)};
                        setEditConfig(updated);
                      }} className="p-1.5 text-blue-400 rounded-xl hover:bg-blue-500/10 transition-colors"><Edit3 size={14}/></button>
                      {(tallerConfig.empresas||[]).length>1&&<button onClick={()=>{
                        const updated={...tallerConfig,empresas:(tallerConfig.empresas||[]).filter((_,j)=>j!==i)};
                        setTallerConfig(updated); saveConfigToFirebase(updated,null); showNotif('Empresa eliminada');
                      }} className="p-1.5 text-red-400 rounded-xl hover:bg-red-500/10 transition-colors"><Trash2 size={14}/></button>}
                    </div>
                  </div>
                </div>
              ))}
              <button onClick={()=>{
                const newEmp={id:Date.now().toString(),nombre:'Nueva Empresa',cuit:'',direccion:'',telefono:'',email:''};
                const updated={...tallerConfig,empresas:[...(tallerConfig.empresas||[]),newEmp]};
                setTallerConfig(updated); saveConfigToFirebase(updated, null);
              }} className={`btn-ghost w-full ${dm?'border-[#30363d] text-slate-300':'border-slate-200 text-slate-600'}`}><Plus size={15}/>Agregar empresa</button>
              {editConfig&&(
                <div className="space-y-3">
                  <p className="font-bold text-sm">Editando empresa</p>
                  {[['nombre','Nombre'],['cuit','CUIT'],['direccion','Dirección'],['telefono','Teléfono'],['email','Email']].map(([f,l])=>(
                    <div key={f}><span className="lbl">{l}</span>
                    <input className={`inp ${dm?'bg-[#0d1117] border-[#30363d] text-white':'bg-slate-50 border-slate-200'}`}
                      value={(editConfig.empresas||[]).find(e=>e._editing)?.[f]||''}
                      onChange={e=>setEditConfig(c=>({...c,empresas:(c.empresas||[]).map(emp=>emp._editing?{...emp,[f]:e.target.value}:emp)}))}/>
                    </div>
                  ))}
                  <div className="flex gap-3">
                    <button onClick={()=>setEditConfig(null)} className={`btn-ghost flex-1 ${dm?'border-[#30363d] text-slate-300':'border-slate-200 text-slate-600'}`}>Cancelar</button>
                    <button onClick={()=>{
                      const cleaned={...editConfig,empresas:(editConfig.empresas||[]).map(({_editing,...e})=>e)};
                      setTallerConfig(cleaned); saveConfigToFirebase(cleaned, null); setEditConfig(null); showNotif("✓ Empresa guardada");
                    }} className="btn-primary flex-1"><Save size={15}/>Guardar</button>
                  </div>
                </div>
              )}
            </div>

            {/* Usuarios */}
            <div className={`card card-s p-6 space-y-4 ${dm?'bg-[#161b22] card-dark':'bg-white'}`}>
              <div className="flex justify-between items-center">
                <p className={`font-bold text-sm flex items-center gap-2 ${dm?'text-white':'text-slate-800'}`}><Shield size={15} className="text-green-500"/>Usuarios</p>
                <button onClick={()=>setShowAddUser(!showAddUser)} className={`btn-ghost text-xs py-1.5 ${dm?'border-[#30363d] text-slate-300':'border-slate-200 text-slate-600'}`}><Plus size={13}/>Agregar</button>
              </div>
              {tallerUsers.map(u=>(
                <div key={u.id} className={`flex items-center justify-between rounded-2xl p-3 border ${dm?'bg-[#0d1117] border-[#30363d]':'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0" style={{background:u.color||'#64748b'}}>{u.name[0]}</div>
                    <div><p className="font-bold text-sm">{u.name}</p><p className="text-xs text-slate-400">@{u.username} · {u.role}</p></div>
                  </div>
                  <div className="flex gap-2">
                    {u.id!==currentUser.id&&<button onClick={()=>saveUsers(tallerUsers.filter(x=>x.id!==u.id))} className="p-1.5 text-red-400"><Trash2 size={13}/></button>}
                  </div>
                </div>
              ))}
              {showAddUser&&(
                <div className={`rounded-2xl p-4 space-y-3 border ${dm?'bg-[#0d1117] border-[#30363d]':'bg-slate-50 border-slate-200'}`}>
                  <p className="font-bold text-sm">Nuevo usuario</p>
                  {[['name','Nombre'],['username','Usuario'],['password','Contraseña']].map(([f,l])=>(
                    <div key={f}><span className="lbl">{l}</span><input className={`inp ${dm?'bg-[#161b22] border-[#30363d] text-white':'bg-white border-slate-200'}`} value={newUserForm[f]||''} onChange={e=>setNewUserForm(u=>({...u,[f]:e.target.value}))}/></div>
                  ))}
                  <div>
                    <span className="lbl">Rol</span>
                    <select className={`inp ${dm?'bg-[#161b22] border-[#30363d] text-white':'bg-white border-slate-200'}`} value={newUserForm.role} onChange={e=>setNewUserForm(u=>({...u,role:e.target.value}))}>
                      <option value="empleado">Empleado</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={()=>setShowAddUser(false)} className={`btn-ghost flex-1 ${dm?'border-[#30363d] text-slate-300':'border-slate-200 text-slate-600'}`}>Cancelar</button>
                    <button onClick={()=>{
                      if(!newUserForm.name||!newUserForm.username||!newUserForm.password){showNotif("Completá todos los campos","error");return;}
                      const newUser={...newUserForm,id:Date.now().toString(),color:`hsl(${Math.random()*360},70%,50%)`};
                      saveUsers([...tallerUsers,newUser]); setNewUserForm({name:'',username:'',password:'',role:'empleado',color:'#3b82f6'}); setShowAddUser(false); showNotif("✓ Usuario creado");
                    }} className="btn-primary flex-1"><Save size={15}/>Crear</button>
                  </div>
                </div>
              )}
            </div>

            {/* Categorías de inventario */}
            <div className={`card card-s p-6 space-y-4 ${dm?'bg-[#161b22] card-dark':'bg-white'}`}>
              <p className={`font-bold text-sm flex items-center gap-2 ${dm?'text-white':'text-slate-800'}`}><Box size={15} className="text-orange-500"/>Categorías de inventario</p>
              <div className="space-y-2">
                {categories.map(cat=>(
                  <div key={cat.id} className={`flex items-center justify-between rounded-xl px-4 py-3 ${dm?'bg-[#0d1117]':'bg-slate-50'}`}>
                    <span className={`font-bold text-sm ${dm?'text-white':'text-slate-800'}`}>{cat.name}</span>
                    <button onClick={()=>deleteCategory(cat.id)} className="text-red-400 hover:text-red-500 p-1"><Trash2 size={14}/></button>
                  </div>
                ))}
                {categories.length===0&&<p className={`text-sm text-center py-2 ${dm?'text-slate-500':'text-slate-400'}`}>Sin categorías todavía</p>}
              </div>
              {showAddCategory?(
                <div className="flex gap-2">
                  <input autoFocus className={`inp flex-1 ${dm?'bg-[#0d1117] border-[#30363d] text-white':'bg-slate-50 border-slate-200'}`} placeholder="Nombre de categoría..." value={newCategoryName} onChange={e=>setNewCategoryName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&saveCategory()}/>
                  <button onClick={saveCategory} className="btn-primary" style={{width:'auto',padding:'10px 16px'}}><Check size={15}/></button>
                  <button onClick={()=>{setShowAddCategory(false);setNewCategoryName('');}} className={`btn-ghost ${dm?'border-[#30363d] text-slate-300':'border-slate-200 text-slate-600'}`} style={{width:'auto',padding:'10px 14px'}}><X size={15}/></button>
                </div>
              ):(
                <button onClick={()=>setShowAddCategory(true)} className={`btn-ghost w-full ${dm?'border-[#30363d] text-slate-300':'border-slate-200 text-slate-600'}`}><Plus size={15}/>Nueva categoría</button>
              )}
            </div>

            {/* Categorías */}
            <div className={`card card-s p-6 space-y-3 ${dm?'bg-[#161b22] card-dark':'bg-white'}`}>
              <p className="font-bold text-sm flex items-center gap-2"><Package size={15} className="text-orange-500"/>Categorías de inventario</p>
              <div className="flex flex-wrap gap-2">
                {categories.map(cat=>(
                  <div key={cat.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${dm?'bg-[#0d1117] border-[#30363d]':'bg-slate-50 border-slate-200'}`}>
                    <span className={`text-sm font-bold ${dm?'text-white':'text-slate-800'}`}>{cat.name}</span>
                    <button onClick={()=>deleteDoc(doc(db,'artifacts',appId,'public','data','categories',cat.id))} className="text-red-400 hover:text-red-500"><X size={12}/></button>
                  </div>
                ))}
                {categories.length===0&&<p className={`text-sm ${dm?'text-slate-500':'text-slate-400'}`}>No hay categorías todavía</p>}
              </div>
              <div className="flex gap-2">
                <input className={`inp flex-1 text-sm ${dm?'bg-[#0d1117] border-[#30363d] text-white':'bg-slate-50 border-slate-200'}`} placeholder="Nueva categoría..." value={newCategoryName} onChange={e=>setNewCategoryName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&newCategoryName.trim()&&addDoc(collection(db,'artifacts',appId,'public','data','categories'),{name:newCategoryName.trim(),createdAt:serverTimestamp()}).then(()=>setNewCategoryName(''))}/>
                <button onClick={()=>newCategoryName.trim()&&addDoc(collection(db,'artifacts',appId,'public','data','categories'),{name:newCategoryName.trim(),createdAt:serverTimestamp()}).then(()=>setNewCategoryName(''))} className="btn-primary" style={{width:'auto',padding:'10px 16px'}}><Plus size={15}/></button>
              </div>
            </div>

            {/* Dark mode */}
            <div className={`card card-s p-5 flex justify-between items-center ${dm?'bg-[#161b22] card-dark':'bg-white'}`}>
              <div><p className="font-bold">Tema oscuro</p><p className={`text-xs ${dm?'text-slate-400':'text-slate-500'}`}>Apariencia de la app</p></div>
              <button onClick={()=>setDarkMode(!dm)} className="p-3 rounded-2xl transition-all" style={{background:dm?'rgba(249,115,22,0.15)':'#f1f5f9',color:dm?'#f97316':'#475569'}}>{dm?<Sun size={22}/>:<Moon size={22}/>}</button>
            </div>

            {/* Delete all */}
            <div className={`card card-s p-5 space-y-3 ${dm?'bg-[#161b22] card-dark':'bg-white'}`}>
              <p className="font-bold text-red-500 text-sm flex items-center gap-2"><Trash2 size={14}/>Zona peligrosa</p>
              <div className="grid grid-cols-2 gap-2">
                {[['repairs','Servicios'],['budgets','Presupuestos'],['inventory','Inventario'],['clients','Clientes'],['vehicles','Vehículos'],['stock_history','Mov. Stock']].map(([col,label])=>(
                  <button key={col} onClick={()=>deleteAll(col)} className="flex items-center gap-2 p-3 rounded-xl text-sm font-bold text-red-500 border transition-all hover:bg-red-50" style={{borderColor:'rgba(239,68,68,0.2)'}}><Trash2 size={13}/>Borrar {label}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* IA */}
        {view==='ai_assistant'&&(
          <div className={`card card-s p-6 space-y-4 max-w-xl mx-auto anim ${dm?'bg-[#161b22]':'bg-white'}`}>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl" style={{background:'linear-gradient(135deg,#fbbf24,#f59e0b)'}}><Sparkles size={20} className="text-white"/></div>
              <div><h2 className={`font-display font-black text-xl ${dm?'text-white':'text-slate-900'}`}>Asistente IA</h2><p className={`text-xs ${dm?'text-slate-400':'text-slate-500'}`}>Diagnósticos técnicos</p></div>
            </div>
            <textarea className={`inp h-36 resize-none ${dm?'bg-[#0d1117] border-[#30363d] text-white placeholder-slate-600':'bg-slate-50 border-slate-200'}`} placeholder="Ej: Ford Focus 2012, ruido metálico al frenar..." value={diagnosisQuery} onChange={e=>setDiagnosisQuery(e.target.value)}/>
            <button onClick={()=>askAI(`Soy mecánico. Problema: ${diagnosisQuery}. Dame diagnóstico probable, qué revisar y repuestos necesarios.`)} disabled={aiLoading||!diagnosisQuery.trim()} className="btn-primary disabled:opacity-50">
              {aiLoading?<><Loader2 className="animate-spin" size={17}/>Analizando...</>:<><Sparkles size={17}/>Consultar IA</>}
            </button>
            {aiResponse&&<div className={`rounded-2xl p-5 text-sm leading-relaxed whitespace-pre-wrap ${dm?'bg-amber-900/15 border border-amber-800/30 text-amber-200':'bg-amber-50 border border-amber-200 text-slate-700'}`}><p className="font-bold text-amber-500 mb-2 text-xs uppercase tracking-wide">Diagnóstico</p>{aiResponse}</div>}
          </div>
        )}

        {/* FORMS */}
        {(view==='add_repair'||view==='edit_repair')&&(
          <RepForm isEdit={view==='edit_repair'} data={view==='edit_repair'?editingRepair:newRepair} setData={view==='edit_repair'?setEditingRepair:setNewRepair} onSubmit={view==='edit_repair'?updateRepair:saveRepair} onCancel={()=>{setView('repairs');setClientSearch('');setEditingRepair(null);}} clients={clients} getCV={getClientVehicles} cs={clientSearch} setCs={setClientSearch} showDD={showClientDD} setShowDD={setShowClientDD} onSC={c=>selectClient(c,view==='edit_repair'?'editRepair':'repair')} onSV={v=>selectVehicle(v,view==='edit_repair'?setEditingRepair:setNewRepair)} inventory={inventory} dm={dm} sc={startCamera} onCreateClientAndVehicle={createClientAndVehicle}/>
        )}
        {(view==='add_budget'||view==='edit_budget')&&(
          <BudForm isEdit={view==='edit_budget'} data={view==='edit_budget'?editingBudget:newBudget} setData={view==='edit_budget'?setEditingBudget:setNewBudget} onSubmit={view==='edit_budget'?updateBudget:saveBudget} onCancel={()=>{setView('budgets');setClientSearchB('');setEditingBudget(null);}} clients={clients} getCV={getClientVehicles} cs={clientSearchB} setCs={setClientSearchB} showDD={showClientDDB} setShowDD={setShowClientDDB} onSC={c=>selectClient(c,view==='edit_budget'?'editBudget':'budget')} onSV={v=>selectVehicle(v,view==='edit_budget'?setEditingBudget:setNewBudget)} inventory={inventory} dm={dm} empresas={tallerConfig.empresas||[]} prefilled={view==='add_budget'&&!!newBudget.vehicle}/>
        )}
        {(view==='add'||view==='edit_product')&&(
          <ProdForm isEdit={view==='edit_product'} data={view==='edit_product'?editingProduct:newProduct} setData={view==='edit_product'?setEditingProduct:setNewProduct} onSubmit={view==='edit_product'?updateProduct:saveProduct} onCancel={()=>setView('list')} dm={dm} sc={t=>startCamera(view==='edit_product'?'editProduct':t)} cats={categories}/>
        )}
        {(view==='add_client'||view==='edit_client')&&(
          <ClForm isEdit={view==='edit_client'} data={view==='edit_client'?editingClient:newClient} setData={view==='edit_client'?setEditingClient:setNewClient} onSubmit={view==='edit_client'?updateClient:saveClient} onCancel={()=>{setView('clients');setEditingClient(null);}} tv={tempVehicle} setTv={setTempVehicle} dm={dm}/>
        )}
        {(view==='add_vehicle'||view==='edit_vehicle')&&(
          <VehForm isEdit={view==='edit_vehicle'} data={view==='edit_vehicle'?editingVehicle:newVehicleForm} setData={view==='edit_vehicle'?setEditingVehicle:setNewVehicleForm} onSubmit={view==='edit_vehicle'?updateVehicle:saveVehicle} onCancel={()=>{setView('vehicles_list');setEditingVehicle(null);}} clients={clients} dm={dm}/>
        )}

      </main>

        {/* QR SCAN */}
        {view==='scan'&&(
          <div className="fixed inset-0 z-[100] flex flex-col" style={{background:'#000',position:'fixed'}}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-12 pb-4">
              <button onClick={()=>{setView('dashboard');setFlashOn(false);setZoomLevel(1);}} className="p-3 rounded-full" style={{background:'rgba(255,255,255,0.1)'}}><X size={22} className="text-white"/></button>
              <p className="text-white font-bold text-sm">Escáner</p>
              <button onClick={async()=>{
                setFlashOn(f=>{
                  const next=!f;
                  try{ qrInstanceRef.current?.applyVideoConstraints({advanced:[{torch:next}]}); }catch{}
                  return next;
                });
              }} className="p-3 rounded-full transition-all" style={{background:flashOn?'rgba(249,115,22,0.4)':'rgba(255,255,255,0.1)'}}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill={flashOn?"#f97316":"white"} xmlns="http://www.w3.org/2000/svg"><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/></svg>
              </button>
            </div>
            {/* Viewfinder */}
            <div style={{flex:1,position:'relative',overflow:'hidden',minHeight:'300px'}}>
              <div id="qr-reader" style={{position:'absolute',inset:0,width:'100%',height:'100%'}}/>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative" style={{width:'260px',height:'160px'}}>
                  {[['top-0 left-0 border-t-4 border-l-4 rounded-tl-2xl'],['top-0 right-0 border-t-4 border-r-4 rounded-tr-2xl'],['bottom-0 left-0 border-b-4 border-l-4 rounded-bl-2xl'],['bottom-0 right-0 border-b-4 border-r-4 rounded-br-2xl']].map(([cls],i)=>(
                    <div key={i} className={`absolute w-8 h-8 border-orange-500 ${cls}`}/>
                  ))}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-full h-0.5 bg-orange-500 opacity-60" style={{animation:'pulse 1.5s ease-in-out infinite'}}/>
                  </div>
                </div>
              </div>
            </div>
            {/* Controls */}
            <div style={{position:'absolute',bottom:'110px',left:0,right:0,paddingLeft:'32px',paddingRight:'32px',display:'flex',flexDirection:'column',gap:'10px'}}>
              <p style={{color:'rgba(255,255,255,0.4)',textAlign:'center',fontSize:'11px'}}>Apuntá al código QR o código de barras</p>
              <div style={{display:'flex',alignItems:'center',gap:'12px',background:'rgba(0,0,0,0.5)',borderRadius:'16px',padding:'10px 16px',backdropFilter:'blur(10px)'}}>
                <span style={{color:'white',fontSize:'11px',fontWeight:700,width:'28px',textAlign:'center'}}>1x</span>
                <input type="range" min="1" max="4" step="0.5" value={zoomLevel} onChange={e=>{
                  const z=Number(e.target.value);
                  setZoomLevel(z);
                  try{ qrInstanceRef.current?.applyVideoConstraints({zoom:z}); }catch{}
                }} style={{flex:1,accentColor:'#f97316',height:'4px'}}/>
                <span style={{color:'#f97316',fontSize:'11px',fontWeight:700,width:'28px',textAlign:'center'}}>{zoomLevel}x</span>
              </div>
            </div>
          </div>
        )}

        {/* CAMERA */}
        {view==='camera'&&(
          <div className="fixed inset-0 z-[100] flex flex-col" style={{background:'#000',position:'fixed'}}>
            <div className="flex items-center justify-between p-5 absolute top-0 left-0 right-0 z-10">
              <button onClick={()=>{setView(({product:'add',editProduct:'edit_product',repair:'add_repair',editRepair:'edit_repair'})[cameraTarget]||'dashboard');setCapturedPhoto(null);}} className="p-3 rounded-full" style={{background:'rgba(0,0,0,0.5)'}}><X size={22} className="text-white"/></button>
              <p className="text-white font-bold text-sm">{capturedPhoto?'Revisar':'Tomar foto'}</p>
              {capturedPhoto?<button onClick={()=>setCapturedPhoto(null)} className="p-3 rounded-full" style={{background:'rgba(0,0,0,0.5)'}}><RefreshCw size={18} className="text-white"/></button>:<div style={{width:48}}/>}
            </div>
            <div style={{flex:1,position:'relative',overflow:'hidden',background:'#000'}}>
              <video ref={videoRef} autoPlay playsInline muted style={{display:capturedPhoto?'none':'block',width:'100%',height:'100%',objectFit:'cover',position:'absolute',inset:0}}/>
              {capturedPhoto&&<img src={capturedPhoto} style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'contain'}} alt=""/>}
              {!capturedPhoto&&<div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',pointerEvents:'none'}}><div style={{width:'220px',height:'220px',borderRadius:'24px',border:'2px solid rgba(255,255,255,0.3)'}}/></div>}
            </div>
            <div className="p-8 flex items-center justify-center gap-8" style={{background:'rgba(0,0,0,0.7)'}}>
              {!capturedPhoto?(
                <button onClick={capturePhoto} className="shutter-btn" disabled={!cameraReady}><div className="shutter-inner"/></button>
              ):(
                <>
                  <button onClick={()=>setCapturedPhoto(null)} className="flex flex-col items-center gap-2 text-white"><div className="p-4 rounded-full" style={{background:'rgba(255,255,255,0.15)'}}><RefreshCw size={22}/></div><span className="text-xs font-bold">Repetir</span></button>
                  <button onClick={confirmPhoto} className="flex flex-col items-center gap-2 text-white"><div className="p-4 rounded-full" style={{background:'linear-gradient(135deg,#f97316,#ea580c)'}}><Check size={22}/></div><span className="text-xs font-bold">Usar</span></button>
                </>
              )}
            </div>
          </div>
        )}

    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────

function SPill({status}){const c=STATUS_CONFIG[status]||STATUS_CONFIG.pendiente;return<span className={`status-pill ${c.tw}`}><span className={`w-1.5 h-1.5 rounded-full ${c.dot}`}/>{c.icon} {c.label}</span>;}
function PayBadge({status}){const c=PAYMENT_CONFIG[status]||PAYMENT_CONFIG.debe;return<span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{background:c.bg,color:c.color}}>{c.icon} {c.label}</span>;}
function SSection({title,children,dm}){return<div style={{background:'#111318',borderRadius:'18px',padding:'20px',border:'1px solid rgba(255,255,255,0.06)'}}><p className="lbl mb-3">{title}</p>{children}</div>;}
function EC({icon,text,dm,className=''}){return<div className={`card card-s p-12 text-center ${dm?'bg-[#161b22] card-dark text-slate-500':'bg-white text-slate-400'} ${className}`}><div className="mx-auto mb-3 opacity-20 flex justify-center">{icon}</div><p className="text-sm font-medium">{text}</p></div>;}
function DangerBtn({onClick}){return<button onClick={onClick} className="p-2.5 rounded-xl text-red-400 border" style={{borderColor:'rgba(239,68,68,0.3)',background:'rgba(239,68,68,0.08)'}}><Trash2 size={16}/></button>;}

function FCard({children,title,onCancel,dm,onSubmit}){
  return<form onSubmit={onSubmit} style={{background:'#111318',borderRadius:'24px',padding:'20px',maxWidth:'560px',margin:'0 auto',border:'1px solid rgba(255,255,255,0.06)',display:'flex',flexDirection:'column',gap:'16px'}} className="anim">
    <div style={{display:'flex',alignItems:'center',gap:'12px',paddingBottom:'16px',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
      <button type="button" onClick={onCancel} style={{padding:'8px',borderRadius:'12px',background:'rgba(255,255,255,0.06)',border:'none',cursor:'pointer',color:'white',display:'flex'}}><ChevronLeft size={18}/></button>
      <h2 style={{fontFamily:"'Outfit',sans-serif",fontWeight:900,fontSize:'20px',color:'white'}}>{title}</h2>
    </div>
    {children}
  </form>;
}
function FInp({label,dm,...p}){return<div><span style={{fontSize:'11px',fontWeight:700,color:'#6b7280',textTransform:'uppercase',letterSpacing:'1px',display:'block',marginBottom:'6px'}}>{label}</span><input style={{borderRadius:'12px',padding:'11px 14px',width:'100%',outline:'none',fontSize:'14px',background:'rgba(255,255,255,0.05)',border:'1.5px solid rgba(255,255,255,0.08)',color:'white',fontFamily:"'Space Grotesk',sans-serif",transition:'border-color 0.2s'}} onFocus={e=>e.target.style.borderColor='#f97316'} onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.08)'} {...p}/></div>;}
function FTA({label,dm,...p}){return<div><span style={{fontSize:'11px',fontWeight:700,color:'#6b7280',textTransform:'uppercase',letterSpacing:'1px',display:'block',marginBottom:'6px'}}>{label}</span><textarea style={{borderRadius:'12px',padding:'11px 14px',width:'100%',outline:'none',fontSize:'14px',background:'rgba(255,255,255,0.05)',border:'1.5px solid rgba(255,255,255,0.08)',color:'white',fontFamily:"'Space Grotesk',sans-serif",resize:'none',height:'80px',transition:'border-color 0.2s'}} onFocus={e=>e.target.style.borderColor='#f97316'} onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.08)'} {...p}/></div>;}
function FBtn({children,color}){return<button type="submit" style={{background:color||'linear-gradient(135deg,#ff6b1a,#e85510)',color:'white',padding:'14px 20px',borderRadius:'14px',fontWeight:700,display:'flex',alignItems:'center',gap:'8px',justifyContent:'center',cursor:'pointer',border:'none',width:'100%',fontSize:'15px',boxShadow:'0 4px 20px rgba(249,115,22,0.35)',letterSpacing:'0.2px'}}>{children}</button>;}


function CDrop({cs,setCs,showDD,setShowDD,clients,onSC,dm}){
  return<div className="relative">
    <span className="lbl">Cliente</span>
    <div className="relative"><Users className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15}/><input className={`inp pl-9 ${dm?'bg-[#0d1117] border-[#30363d] text-white placeholder-slate-600':'bg-slate-50 border-slate-200'}`} placeholder="Buscar cliente..." value={cs} onChange={e=>{setCs(e.target.value);setShowDD(true);}} onFocus={()=>setShowDD(true)}/></div>
    {showDD&&cs&&<div className={`absolute z-30 w-full rounded-2xl shadow-2xl mt-1 max-h-40 overflow-y-auto border ${dm?'bg-[#161b22] border-[#30363d]':'bg-white border-slate-200'}`}>
      {clients.filter(c=>c.name.toLowerCase().includes(cs.toLowerCase())).map(c=><div key={c.id} onClick={()=>onSC(c)} className={`p-3 cursor-pointer border-b last:border-0 ${dm?'hover:bg-[#0d1117] border-[#30363d]':'hover:bg-orange-50 border-slate-50'}`}><p className="font-bold text-sm">{c.name}</p><p className="text-xs text-slate-400">{c.phone}</p></div>)}
      {clients.filter(c=>c.name.toLowerCase().includes(cs.toLowerCase())).length===0&&<p className="p-3 text-slate-400 text-sm text-center">No encontrado</p>}
    </div>}
  </div>;
}

function VDrop({clientId,plate,onSV,getCV,dm}){
  const list=getCV(clientId);
  if(!clientId||list.length===0) return null;
  return<div><span className="lbl">Vehículos del cliente</span><div className="flex gap-2 flex-wrap">{list.map((v,i)=><button key={i} type="button" onClick={()=>onSV(v)} className={`px-3 py-2 rounded-xl text-xs font-bold border-2 transition-all ${plate===v.plate?'border-orange-500 bg-orange-50 text-orange-700':dm?'border-[#30363d] bg-[#0d1117] text-slate-400':'border-slate-200 bg-slate-50 text-slate-600'}`}>🚗 {v.make} {v.model} · <span className="font-mono">{v.plate}</span></button>)}</div></div>;
}

function PSel({inventory,parts,onChange,dm}){
  const [search,setSearch]=useState('');
  return<div className="space-y-2">
    <span className="lbl">Repuestos</span>
    <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13}/><input className={`inp pl-9 text-sm ${dm?'bg-[#0d1117] border-[#30363d] text-white placeholder-slate-600':'bg-slate-50 border-slate-200'}`} placeholder="Buscar repuesto..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
    {search&&<div className={`rounded-2xl overflow-hidden shadow-2xl max-h-36 overflow-y-auto border ${dm?'bg-[#161b22] border-[#30363d]':'bg-white border-slate-200'}`}>
      {inventory.filter(i=>i.name.toLowerCase().includes(search.toLowerCase())&&i.quantity>0&&!parts.find(p=>p.id===i.id)).map(i=><div key={i.id} onClick={()=>{const precio=i.salePrice>0?i.salePrice:i.cost;onChange([...parts,{id:i.id,name:i.name,qty:1,cost:precio,costOriginal:i.cost}]);setSearch('');}} className={`p-3 cursor-pointer text-sm flex justify-between border-b last:border-0 ${dm?'hover:bg-[#0d1117] border-[#30363d]':'hover:bg-orange-50 border-slate-50'}`}><span className="font-bold">{i.name}</span><div className="text-right"><p className="text-emerald-400 text-xs font-bold">${Number(i.salePrice>0?i.salePrice:i.cost).toLocaleString()}</p><p className="text-slate-400 text-[10px]">stock: {i.quantity}</p></div></div>)}
      {inventory.filter(i=>i.name.toLowerCase().includes(search.toLowerCase())).length===0&&<p className="p-3 text-slate-400 text-sm text-center">No encontrado</p>}
    </div>}
    {parts.length>0&&<div className="space-y-1.5">
      {parts.map((p,idx)=><div key={idx} className={`flex items-center gap-2 rounded-xl px-3 py-2.5 border ${dm?'bg-[#0d1117] border-[#30363d]':'bg-slate-50 border-slate-200'}`}>
        <span className="text-sm font-bold flex-1">{p.name}</span>
        <input type="number" min="1" value={p.qty} onChange={e=>{const np=[...parts];np[idx].qty=Number(e.target.value);onChange(np);}} className={`inp text-center text-sm py-1 px-2 ${dm?'bg-[#161b22] border-[#30363d] text-white':'bg-white border-slate-200'}`} style={{width:'3.5rem'}}/>
        <span className="text-xs font-bold text-slate-400 w-20 text-right">${(p.cost*p.qty).toLocaleString()}</span>
        <button type="button" onClick={()=>onChange(parts.filter((_,i)=>i!==idx))} className="text-red-400 p-1"><X size={13}/></button>
      </div>)}
      <p className={`text-right text-xs font-bold pr-2 ${dm?'text-slate-500':'text-slate-400'}`}>Subtotal: ${parts.reduce((s,p)=>s+(p.cost*p.qty),0).toLocaleString()}</p>
    </div>}
  </div>;
}

function BudCalc({extras,onChange,dm}){
  const rows=extras||[];
  const addRow=()=>onChange([...rows,{desc:'',qty:1,price:''}]);
  const upd=(idx,field,val)=>{const r=[...rows];r[idx]={...r[idx],[field]:val};onChange(r);};
  const del=idx=>onChange(rows.filter((_,i)=>i!==idx));
  const total=rows.reduce((s,r)=>s+(Number(r.qty||1)*Number(r.price||0)),0);
  return<div>
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'8px'}}>
      <span className="lbl" style={{margin:0}}>Detalle adicional (calculadora)</span>
      <button type="button" onClick={addRow} style={{fontSize:'11px',fontWeight:700,color:'#f97316',background:'rgba(249,115,22,0.1)',border:'none',cursor:'pointer',padding:'4px 10px',borderRadius:'8px',display:'flex',alignItems:'center',gap:'4px'}}><Plus size={12}/>Agregar línea</button>
    </div>
    {rows.length>0&&(
      <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'14px',overflow:'hidden'}}>
        {/* Header */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 60px 90px 32px',gap:'4px',padding:'8px 10px',background:'rgba(255,255,255,0.05)',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
          <span style={{fontSize:'10px',fontWeight:700,color:'#6b7280',textTransform:'uppercase',letterSpacing:'1px'}}>Descripción</span>
          <span style={{fontSize:'10px',fontWeight:700,color:'#6b7280',textTransform:'uppercase',letterSpacing:'1px',textAlign:'center'}}>Cant.</span>
          <span style={{fontSize:'10px',fontWeight:700,color:'#6b7280',textTransform:'uppercase',letterSpacing:'1px',textAlign:'right'}}>Precio</span>
          <span/>
        </div>
        {rows.map((r,i)=>(
          <div key={i} style={{display:'grid',gridTemplateColumns:'1fr 60px 90px 32px',gap:'4px',padding:'6px 10px',borderBottom:'1px solid rgba(255,255,255,0.04)',alignItems:'center'}}>
            <input value={r.desc||''} onChange={e=>upd(i,'desc',e.target.value)} placeholder="Ítem..." style={{background:'transparent',border:'none',outline:'none',color:'white',fontSize:'13px',fontFamily:"'Space Grotesk',sans-serif",width:'100%'}}/>
            <input type="number" min="1" value={r.qty||1} onChange={e=>upd(i,'qty',e.target.value)} style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'8px',color:'white',fontSize:'13px',textAlign:'center',padding:'4px',fontFamily:"'Space Grotesk',sans-serif",width:'100%',outline:'none'}}/>
            <input type="number" min="0" value={r.price||''} onChange={e=>upd(i,'price',e.target.value)} placeholder="0" style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'8px',color:'#10b981',fontSize:'13px',textAlign:'right',padding:'4px 6px',fontFamily:"'Space Grotesk',sans-serif",width:'100%',outline:'none'}}/>
            <button type="button" onClick={()=>del(i)} style={{background:'none',border:'none',cursor:'pointer',color:'#ef4444',display:'flex',justifyContent:'center'}}><X size={13}/></button>
          </div>
        ))}
        {/* Subtotal row */}
        <div style={{display:'flex',justifyContent:'space-between',padding:'8px 12px',background:'rgba(59,130,246,0.08)',borderTop:'1px solid rgba(59,130,246,0.15)'}}>
          <span style={{fontSize:'12px',fontWeight:700,color:'#6b7280'}}>Subtotal calculadora</span>
          <span style={{fontSize:'13px',fontWeight:900,color:'#3b82f6',fontFamily:"'Outfit',sans-serif"}}>${total.toLocaleString()}</span>
        </div>
      </div>
    )}
    {rows.length===0&&<p style={{fontSize:'12px',color:'#4b5563',textAlign:'center',padding:'10px 0'}}>Agregá líneas para detallar ítems adicionales</p>}
  </div>;
}

function TBox({parts,laborCost,extras,color='green'}){
  const partsTotal=(parts||[]).reduce((s,p)=>s+(p.cost*p.qty),0);
  const extrasTotal=(extras||[]).reduce((s,e)=>s+(Number(e.qty||1)*Number(e.price||0)),0);
  const t=partsTotal+Number(laborCost||0)+extrasTotal;
  if(t<=0) return null;
  return<div className="rounded-2xl p-4 text-sm font-bold" style={{background:color==='green'?'rgba(16,185,129,0.12)':'rgba(59,130,246,0.12)',border:`1px solid ${color==='green'?'rgba(16,185,129,0.25)':'rgba(59,130,246,0.25)'}`,color:color==='green'?'#10b981':'#3b82f6'}}>💰 Total: ${t.toLocaleString()}</div>;
}

function RepForm({isEdit,data,setData,onSubmit,onCancel,clients,getCV,cs,setCs,showDD,setShowDD,onSC,onSV,inventory,dm,sc,onCreateClientAndVehicle}){
  const [showNewClient,setShowNewClient]=useState(false);
  const [newCl,setNewCl]=useState({name:'',phone:'',email:''});
  const [newVeh,setNewVeh]=useState({make:'',model:'',year:'',plate:'',km:''});
  const handleCreateInline=async()=>{
    if(!newCl.name.trim()){return;}
    await onCreateClientAndVehicle(newCl,newVeh,setData);
    setShowNewClient(false);setNewCl({name:'',phone:'',email:''});setNewVeh({make:'',model:'',year:'',plate:'',km:''});
    setCs(newCl.name);
  };
  if(!data) return null;
  return<FCard onSubmit={onSubmit} title={isEdit?'Editar Servicio':'Nuevo Servicio'} onCancel={onCancel} dm={dm}>
    {/* Client search + inline creation */}
    <div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'5px'}}>
        <span className="lbl" style={{margin:0}}>Cliente</span>
        {!isEdit&&<button type="button" onClick={()=>setShowNewClient(!showNewClient)} style={{fontSize:'11px',fontWeight:700,color:showNewClient?'#f97316':'#6b7280',background:showNewClient?'rgba(249,115,22,0.1)':'transparent',border:'none',cursor:'pointer',padding:'4px 8px',borderRadius:'8px',display:'flex',alignItems:'center',gap:'4px'}}><Plus size={12}/>{showNewClient?'Cancelar':'Nuevo cliente'}</button>}
      </div>
      <CDrop cs={cs} setCs={setCs} showDD={showDD} setShowDD={setShowDD} clients={clients} onSC={onSC} dm={dm}/>
      {showNewClient&&(
        <div style={{marginTop:'10px',background:'rgba(249,115,22,0.06)',border:'1.5px solid rgba(249,115,22,0.2)',borderRadius:'16px',padding:'14px',display:'flex',flexDirection:'column',gap:'10px'}}>
          <p style={{fontSize:'12px',fontWeight:700,color:'#f97316',margin:0}}>👤 Nuevo cliente</p>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}>
            <FInp label="Nombre *" placeholder="Juan García" value={newCl.name} onChange={e=>setNewCl(c=>({...c,name:e.target.value}))} dm={dm}/>
            <FInp label="Teléfono" placeholder="11-xxxx-xxxx" value={newCl.phone} onChange={e=>setNewCl(c=>({...c,phone:e.target.value}))} dm={dm}/>
          </div>
          <p style={{fontSize:'12px',fontWeight:700,color:'#14b8a6',margin:0}}>🚗 Vehículo (opcional)</p>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}>
            <FInp label="Marca" placeholder="Toyota" value={newVeh.make} onChange={e=>setNewVeh(v=>({...v,make:e.target.value}))} dm={dm}/>
            <FInp label="Modelo" placeholder="Corolla" value={newVeh.model} onChange={e=>setNewVeh(v=>({...v,model:e.target.value}))} dm={dm}/>
            <FInp label="Año" placeholder="2018" value={newVeh.year} onChange={e=>setNewVeh(v=>({...v,year:e.target.value}))} dm={dm}/>
            <FInp label="Patente" placeholder="ABC123" value={newVeh.plate} onChange={e=>setNewVeh(v=>({...v,plate:e.target.value.toUpperCase()}))} dm={dm}/>
            <FInp label="Km" placeholder="75000" type="number" value={newVeh.km} onChange={e=>setNewVeh(v=>({...v,km:e.target.value}))} dm={dm}/>
          </div>
          <button type="button" onClick={handleCreateInline} style={{background:'linear-gradient(135deg,#f97316,#ea580c)',color:'white',border:'none',borderRadius:'12px',padding:'10px 16px',fontWeight:700,fontSize:'13px',cursor:'pointer',display:'flex',alignItems:'center',gap:'6px',justifyContent:'center'}}><Check size={14}/>Crear y vincular</button>
        </div>
      )}
    </div>
    <VDrop clientId={data.clientId} plate={data.plate} onSV={onSV} getCV={getCV} dm={dm}/>
    <div className="grid grid-cols-2 gap-3">
      <FInp label="Vehículo *" required placeholder="Toyota Corolla" value={data.vehicle||''} onChange={e=>setData(f=>({...f,vehicle:e.target.value}))} dm={dm}/>
      <FInp label="Patente" placeholder="ABC123" className={`inp uppercase font-mono ${dm?'bg-[#0d1117] border-[#30363d] text-white':'bg-slate-50 border-slate-200'}`} value={data.plate||''} onChange={e=>setData(f=>({...f,plate:e.target.value.toUpperCase()}))} dm={dm}/>
      <FInp label="Km" type="number" placeholder="75000" value={data.km||''} onChange={e=>setData(f=>({...f,km:e.target.value}))} dm={dm}/>
      <FInp label="Mano de obra $" type="number" min="0" placeholder="0" value={data.laborCost||''} onChange={e=>setData(f=>({...f,laborCost:e.target.value}))} dm={dm}/>
    </div>
    <div><span className="lbl">Estado</span><div className="flex gap-2 flex-wrap">{Object.entries(STATUS_CONFIG).map(([key,cfg])=><button key={key} type="button" onClick={()=>setData(f=>({...f,status:key}))} className={`status-pill cursor-pointer border-2 transition-all ${data.status===key?'border-orange-500 ring-2 ring-orange-200':'border-transparent'} ${cfg.tw}`}>{cfg.icon} {cfg.label}</button>)}</div></div>
    <div><span className="lbl">Pago</span><div className="flex gap-2 flex-wrap">{Object.entries(PAYMENT_CONFIG).map(([key,cfg])=><button key={key} type="button" onClick={()=>setData(f=>({...f,paymentStatus:key}))} className="text-xs font-bold px-3 py-2 rounded-xl border-2 transition-all" style={{color:cfg.color,background:(data.paymentStatus||'debe')===key?cfg.bg:'transparent',borderColor:(data.paymentStatus||'debe')===key?cfg.color:'rgba(100,116,139,0.3)'}}>{cfg.icon} {cfg.label}</button>)}</div></div>
    <FTA label="Descripción" placeholder="Trabajo realizado..." value={data.description||''} onChange={e=>setData(f=>({...f,description:e.target.value}))} dm={dm}/>
    <FInp label="Notas" placeholder="Observaciones..." value={data.notes||''} onChange={e=>setData(f=>({...f,notes:e.target.value}))} dm={dm}/>
    <div><span className="lbl">Foto</span><div className="flex gap-2"><button type="button" onClick={()=>sc(isEdit?'editRepair':'repair')} className={`btn-ghost flex-1 ${dm?'border-[#30363d] text-slate-300':'border-slate-200 text-slate-600'}`}><Camera size={14}/>Foto</button>{data.imageUrl&&<div className="relative"><img src={data.imageUrl} className="h-12 w-16 object-cover rounded-xl" alt=""/><button type="button" onClick={()=>setData(f=>({...f,imageUrl:''}))} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5"><X size={9}/></button></div>}</div></div>
    <PSel inventory={inventory} parts={data.partsUsed||[]} onChange={p=>setData(f=>({...f,partsUsed:p}))} dm={dm}/>
    <TBox parts={data.partsUsed} laborCost={data.laborCost} color="green"/>
    <FBtn>{isEdit?'Guardar cambios':'Finalizar Servicio'}</FBtn>
  </FCard>;
}

function BudForm({isEdit,data,setData,onSubmit,onCancel,clients,getCV,cs,setCs,showDD,setShowDD,onSC,onSV,inventory,dm,empresas,prefilled}){
  if(!data) return null;
  return<FCard onSubmit={onSubmit} title={isEdit?'Editar Presupuesto':'Nuevo Presupuesto'} onCancel={onCancel} dm={dm}>
    {prefilled&&<span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-lg font-bold self-start">Datos precargados — revisá</span>}
    <div className="grid grid-cols-2 gap-3">
      <FInp label="Fecha" type="date" value={data.date||''} onChange={e=>setData(f=>({...f,date:e.target.value}))} dm={dm}/>
      <FInp label="N° Presupuesto" placeholder="Auto" value={data.budgetNumber||''} onChange={e=>setData(f=>({...f,budgetNumber:e.target.value}))} dm={dm}/>
    </div>
    {/* Empresa selector */}
    {empresas.length>1&&<div><span className="lbl">Empresa de facturación</span>
      <div className="flex gap-2 flex-wrap">
        {empresas.map(e=><button key={e.id} type="button" onClick={()=>setData(f=>({...f,empresaId:e.id}))} className={`px-3 py-2 rounded-xl text-xs font-bold border-2 transition-all flex items-center gap-1 ${(data.empresaId||'1')===e.id?'border-blue-500 bg-blue-50 text-blue-700':dm?'border-[#30363d] bg-[#0d1117] text-slate-400':'border-slate-200 bg-slate-50 text-slate-600'}`}><Building2 size={11}/>{e.nombre}</button>)}
      </div>
    </div>}
    <CDrop cs={cs} setCs={setCs} showDD={showDD} setShowDD={setShowDD} clients={clients} onSC={onSC} dm={dm}/>
    <FInp label="Teléfono cliente" placeholder="11-1234-5678" value={data.clientPhone||''} onChange={e=>setData(f=>({...f,clientPhone:e.target.value}))} dm={dm}/>
    <VDrop clientId={data.clientId} plate={data.plate} onSV={onSV} getCV={getCV} dm={dm}/>
    <div className="grid grid-cols-2 gap-3">
      <FInp label="Vehículo *" required placeholder="Ford Ka" value={data.vehicle||''} onChange={e=>setData(f=>({...f,vehicle:e.target.value}))} dm={dm}/>
      <FInp label="Patente" placeholder="ABC123" value={data.plate||''} onChange={e=>setData(f=>({...f,plate:e.target.value.toUpperCase()}))} dm={dm}/>
      <FInp label="Km" type="number" placeholder="75000" value={data.km||''} onChange={e=>setData(f=>({...f,km:e.target.value}))} dm={dm}/>
      <FInp label="Mano de obra $" type="number" min="0" placeholder="0" value={data.laborCost||''} onChange={e=>setData(f=>({...f,laborCost:e.target.value}))} dm={dm}/>
    </div>
    <FTA label="Descripción" placeholder="Trabajo a realizar..." value={data.description||''} onChange={e=>setData(f=>({...f,description:e.target.value}))} dm={dm}/>
    <PSel inventory={inventory} parts={data.partsUsed||[]} onChange={p=>setData(f=>({...f,partsUsed:p}))} dm={dm}/>
    {/* Excel-style calculator for extra line items */}
    <BudCalc extras={data.extras||[]} onChange={extras=>setData(f=>({...f,extras}))} dm={dm}/>
    <FTA label="Notas" placeholder="Condiciones, garantía..." value={data.notes||''} onChange={e=>setData(f=>({...f,notes:e.target.value}))} dm={dm}/>
    <TBox parts={data.partsUsed} laborCost={data.laborCost} extras={data.extras} color="blue"/>
    <FBtn>{isEdit?'Guardar cambios':'Guardar Presupuesto'}</FBtn>
  </FCard>;
}

function ProdForm({isEdit,data,setData,onSubmit,onCancel,dm,sc,cats=[]}){
  if(!data) return null;
  return<FCard onSubmit={onSubmit} title={isEdit?'Editar Repuesto':'Nuevo Repuesto'} onCancel={onCancel} dm={dm}>
    <FInp label="Nombre *" required placeholder="Filtro de aceite" value={data.name||''} onChange={e=>setData(f=>({...f,name:e.target.value}))} dm={dm}/>
    <FInp label="Descripción" placeholder="Marca, modelo..." value={data.description||''} onChange={e=>setData(f=>({...f,description:e.target.value}))} dm={dm}/>
    {data.barcode&&<div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{background:'rgba(249,115,22,0.1)',border:'1px solid rgba(249,115,22,0.2)'}}><QrCode size={14} className="text-orange-500"/><span className="text-xs font-bold text-orange-500">Código: </span><span className="font-mono text-xs">{data.barcode}</span></div>}
    <FInp label="Ubicación" placeholder="Estante A, Cajón 2" value={data.location||''} onChange={e=>setData(f=>({...f,location:e.target.value}))} dm={dm}/>
    <CatSelect data={data} setData={setData} categories={cats} dm={dm}/>
    <div className="grid grid-cols-2 gap-3">
      <FInp label="Proveedor" placeholder="Dist. X" value={data.supplier||''} onChange={e=>setData(f=>({...f,supplier:e.target.value}))} dm={dm}/>
      <FInp label="Tel. proveedor" placeholder="11-xxxx" value={data.supplierPhone||''} onChange={e=>setData(f=>({...f,supplierPhone:e.target.value}))} dm={dm}/>
    </div>
    <div><span className="lbl">Foto</span>
      <div className="flex gap-2 items-center">
        <button type="button" onClick={()=>sc('product')} className={`btn-ghost flex-1 ${dm?'border-[#30363d] text-slate-300':'border-slate-200 text-slate-600'}`}><Camera size={14}/>Tomar</button>
        <input className={`inp text-xs flex-1 ${dm?'bg-[#0d1117] border-[#30363d] text-white':'bg-slate-50 border-slate-200'}`} placeholder="O pegar URL..." value={data.imageUrl||''} onChange={e=>setData(f=>({...f,imageUrl:e.target.value}))}/>
      </div>
      {data.imageUrl&&<img src={data.imageUrl} alt="" className="w-24 h-24 object-cover rounded-2xl mt-2"/>}
    </div>
    <div className="grid grid-cols-2 gap-3">
      <FInp label="Precio costo $" type="number" min="0" placeholder="0" value={data.cost||""} onChange={e=>setData(f=>({...f,cost:e.target.value}))} dm={dm}/>
      <FInp label="Precio venta $" type="number" min="0" placeholder="0" value={data.salePrice||""} onChange={e=>setData(f=>({...f,salePrice:e.target.value}))} dm={dm}/>
      <FInp label="Stock" type="number" min="0" value={data.quantity||0} onChange={e=>setData(f=>({...f,quantity:e.target.value}))} dm={dm}/>
      <FInp label="Mínimo" type="number" min="0" placeholder="1" value={data.minStock||""} onChange={e=>setData(f=>({...f,minStock:e.target.value}))} dm={dm}/>
    </div>
    <FBtn>{isEdit?'Guardar cambios':'Guardar Repuesto'}</FBtn>
  </FCard>;
}

function ClForm({isEdit,data,setData,onSubmit,onCancel,tv,setTv,dm}){
  if(!data) return null;
  return<FCard onSubmit={onSubmit} title={isEdit?'Editar Cliente':'Nuevo Cliente'} onCancel={onCancel} dm={dm}>
    <FInp label="Nombre *" required placeholder="Juan García" value={data.name||''} onChange={e=>setData(f=>({...f,name:e.target.value}))} dm={dm}/>
    <div className="grid grid-cols-2 gap-3">
      <FInp label="Teléfono" placeholder="11-1234-5678" value={data.phone||''} onChange={e=>setData(f=>({...f,phone:e.target.value}))} dm={dm}/>
      <FInp label="Email" type="email" placeholder="juan@email.com" value={data.email||''} onChange={e=>setData(f=>({...f,email:e.target.value}))} dm={dm}/>
    </div>
    {!isEdit&&<div className={`rounded-2xl p-4 space-y-3`} style={{background:dm?'#0d1117':'#f8fafc',border:`1.5px dashed ${dm?'#30363d':'#e2e8f0'}`}}>
      <p className="font-bold text-sm flex items-center gap-2"><Car size={13} className="text-orange-500"/>Agregar vehículos</p>
      <div className="grid grid-cols-3 gap-2">
        {[['make','Marca','Toyota'],['model','Modelo','Corolla'],['year','Año','2018'],['plate','Patente','ABC123'],['km','KM','75000']].map(([field,label,ph])=>(
          <div key={field}><span className="lbl">{label}</span><input className={`inp text-sm ${field==='plate'?'uppercase font-mono':''} ${dm?'bg-[#161b22] border-[#30363d] text-white':'bg-white border-slate-200'}`} placeholder={ph} value={tv[field]||''} onChange={e=>setTv(t=>({...t,[field]:e.target.value}))}/></div>
        ))}
        <div className="flex items-end"><button type="button" onClick={()=>{if(tv.make){setData(c=>({...c,vehicles:[...(c.vehicles||[]),{...tv}]}));setTv({make:'',model:'',year:'',plate:'',km:''});}}} className="btn-dark w-full text-sm"><Plus size={13}/>Add</button></div>
      </div>
      {(data.vehicles||[]).map((v,i)=><div key={i} className={`flex items-center justify-between rounded-xl px-3 py-2 ${dm?'bg-[#161b22]':'bg-white'} shadow-sm`}><p className="text-sm font-bold">🚗 {v.make} {v.model} · <span className="font-mono">{v.plate}</span></p><button type="button" onClick={()=>setData(c=>({...c,vehicles:c.vehicles.filter((_,j)=>j!==i)}))} className="text-red-400"><X size={13}/></button></div>)}
    </div>}
    <FBtn>{isEdit?'Guardar cambios':'Guardar Cliente'}</FBtn>
  </FCard>;
}

function VehForm({isEdit,data,setData,onSubmit,onCancel,clients,dm}){
  if(!data) return null;
  return<FCard onSubmit={onSubmit} title={isEdit?'Editar Vehículo':'Nuevo Vehículo'} onCancel={onCancel} dm={dm}>
    <div className="grid grid-cols-2 gap-3">
      <FInp label="Marca *" required placeholder="Toyota" value={data.make||''} onChange={e=>setData(f=>({...f,make:e.target.value}))} dm={dm}/>
      <FInp label="Modelo *" required placeholder="Corolla" value={data.model||''} onChange={e=>setData(f=>({...f,model:e.target.value}))} dm={dm}/>
      <FInp label="Año" placeholder="2018" value={data.year||''} onChange={e=>setData(f=>({...f,year:e.target.value}))} dm={dm}/>
      <FInp label="Patente" placeholder="ABC123" value={data.plate||''} onChange={e=>setData(f=>({...f,plate:e.target.value.toUpperCase()}))} dm={dm}/>
      <FInp label="Km" type="number" placeholder="75000" value={data.km||''} onChange={e=>setData(f=>({...f,km:e.target.value}))} dm={dm}/>
    </div>
    <div><span className="lbl">Vincular a cliente</span>
      <select className={`inp ${dm?'bg-[#0d1117] border-[#30363d] text-white':'bg-slate-50 border-slate-200'}`} value={data.clientId||''} onChange={e=>{const c=clients.find(c=>c.id===e.target.value);setData(f=>({...f,clientId:e.target.value,clientName:c?.name||''}));}}>
        <option value="">— Sin cliente —</option>
        {clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
    </div>
    <FBtn>{isEdit?'Guardar cambios':'Guardar Vehículo'}</FBtn>
  </FCard>;
}
