/**
 * ══════════════════════════════════════════════════════════════
 *  AMERICAN FULL FIGHTING — BONS-EN-CHABLAIS
 *  Cloudflare Worker — sert index.html + API REST D1
 * ══════════════════════════════════════════════════════════════
 */

// ── Page HTML intégrée ────────────────────────────────────────
const INDEX_HTML = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>American Full Fighting Bons-en-Chablais — Inscription aux Événements</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
--red:#E10600;
--red-dark:#8B0000;
--dark:#050505;
--dark-2:#0f0f0f;
--dark-3:#161616;
--white:#ffffff;
--text:#f5f5f5;
--muted:#9b9b9b;
--border:#242424;
--gold:#d4af37;

--radius:18px;
--radius-lg:28px;

--font-display:'Bebas Neue',sans-serif;
--font-body:'DM Sans',sans-serif;

--shadow-red:0 0 30px rgba(225,6,0,.25);
--shadow-card:0 10px 40px rgba(0,0,0,.45);
}
/* HEADER */
header{background:var(--dark);color:var(--white);padding:0 2rem}
.header-inner{max-width:900px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;height:64px}
.logo{display:flex;align-items:center;gap:12px}
.logo-icon{width:36px;height:36px;background:var(--red);border-radius:6px;display:flex;align-items:center;justify-content:center}
.logo-icon svg{width:22px;height:22px;fill:white}
.logo-name{font-family:var(--font-display);font-size:22px;letter-spacing:1px;color:white}
.logo-season{font-size:12px;color:#888;margin-top:-2px}
.header-badge{font-size:12px;background:#1a1a1a;border:1px solid #333;color:#aaa;padding:4px 12px;border-radius:20px}

/* HERO */
.hero{
position:relative;
min-height:82vh;
display:flex;
align-items:center;
overflow:hidden;
background:
linear-gradient(to right, rgba(0,0,0,.92), rgba(0,0,0,.55)),
url('https://images.unsplash.com/photo-1517438476312-10d79c077509?q=80&w=2070&auto=format&fit=crop');
background-size:cover;
background-position:center;
padding:4rem 2rem;
}
.hero::after{
content:'';
position:absolute;
inset:0;
background:
radial-gradient(circle at center,
rgba(225,6,0,.18),
transparent 60%);
pointer-events:none;
}

/* FILTERS */
.filters-bar{background:white;border-bottom:1px solid var(--border);position:sticky;top:0;z-index:100}
.filters-inner{max-width:900px;margin:0 auto;padding:0 2rem;display:flex;align-items:center;gap:8px;height:52px;overflow-x:auto}
.filter-btn{font-family:var(--font-body);font-size:13px;font-weight:500;padding:5px 14px;border-radius:20px;border:1px solid var(--border);background:white;color:var(--muted);cursor:pointer;white-space:nowrap;transition:all .15s}
.filter-btn:hover{border-color:var(--red);color:var(--red)}
.filter-btn.active{background:var(--red);border-color:var(--red);color:white}

/* EVENTS GRID */
.events-section{max-width:900px;margin:0 auto;padding:2.5rem 2rem}
.section-label{font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin-bottom:1.5rem}
.events-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:20px}
.event-card{background:white;border:1px solid var(--border);border-radius:var(--radius-lg);overflow:hidden;cursor:pointer;transition:transform .15s,border-color .15s,box-shadow .15s}
.event-card:hover{transform:translateY(-3px);border-color:#bbb;box-shadow:0 8px 24px rgba(0,0,0,.08)}
.event-card.featured{border-color:var(--red);border-width:2px}
.card-badge-row{padding:14px 16px 0;display:flex;align-items:center;justify-content:space-between}
.badge{font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;padding:3px 10px;border-radius:20px}
.badge-stage{background:#EBF5FB;color:#1A5276}
.badge-compet{background:#FDEDEC;color:#922B21}
.badge-stage-ext{background:#EAFAF1;color:#1E8449}
.badge-grade{background:#F5EEF8;color:#6C3483}
.badge-sold-out{background:#f5f5f5;color:#999}
.card-spots{font-size:12px;color:var(--muted)}
.card-spots.low{color:#E67E22;font-weight:500}
.card-spots.full{color:#999}
.card-body{padding:12px 16px 16px}
.card-title{font-family:var(--font-display);font-size:22px;letter-spacing:.5px;line-height:1.1;margin-bottom:4px}
.card-subtitle{font-size:13px;color:var(--muted);margin-bottom:14px}
.card-meta{display:flex;flex-direction:column;gap:5px}
.card-meta-row{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--mid)}
.card-meta-row svg{width:14px;height:14px;flex-shrink:0;stroke:var(--muted);fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.card-footer{padding:12px 16px;border-top:1px solid #f2f2f2;display:flex;align-items:center;justify-content:space-between}
.card-price{font-family:var(--font-display);font-size:26px;color:var(--dark)}
.card-price sup{font-family:var(--font-body);font-size:13px;font-weight:500;vertical-align:super;margin-right:2px}
.card-price .free{font-size:16px;font-weight:600;color:var(--red);font-family:var(--font-body)}
.btn-inscr{font-family:var(--font-body);font-size:13px;font-weight:600;padding:7px 16px;border-radius:6px;border:none;cursor:pointer;transition:all .15s}
.btn-inscr.primary{background:var(--red);color:white}
.btn-inscr.primary:hover{background:var(--red-dark)}
.btn-inscr.disabled{background:#eee;color:#aaa;cursor:not-allowed}
.btn-inscr.outline{background:white;color:var(--dark);border:1px solid var(--border)}
.btn-inscr.outline:hover{border-color:#999}

/* MODAL */
.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:1000;display:none;align-items:center;justify-content:center;padding:1rem;backdrop-filter:blur(2px)}
.modal-overlay.open{display:flex}
.modal{background:white;border-radius:var(--radius-lg);width:100%;max-width:600px;max-height:90vh;overflow-y:auto;position:relative}
.modal-header{background:var(--dark);color:white;padding:1.5rem 2rem 1.25rem;border-radius:var(--radius-lg) var(--radius-lg) 0 0;position:sticky;top:0;z-index:10}
.modal-close{position:absolute;top:1rem;right:1.25rem;background:none;border:none;color:#888;cursor:pointer;font-size:22px;line-height:1;padding:4px}
.modal-close:hover{color:white}
.modal-event-title{font-family:var(--font-display);font-size:28px;letter-spacing:1px;line-height:1.1}
.modal-event-sub{font-size:13px;color:#999;margin-top:4px}
.progress-bar{background:#1a1a1a;height:4px;margin-top:14px;border-radius:2px;overflow:hidden}
.progress-fill{height:100%;background:var(--red);border-radius:2px;transition:width .3s}
.progress-steps{display:flex;justify-content:space-between;margin-top:6px}
.progress-step{font-size:11px;color:#555;transition:color .2s}
.progress-step.active{color:var(--red);font-weight:500}
.modal-body{padding:1.75rem 2rem}
.step{display:none}
.step.active{display:block}
.step-title{font-size:18px;font-weight:600;margin-bottom:4px;color:var(--dark)}
.step-desc{font-size:14px;color:var(--muted);margin-bottom:1.5rem}
.form-group{margin-bottom:1.1rem}
.form-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
label{display:block;font-size:13px;font-weight:500;margin-bottom:5px;color:var(--mid)}
label .req{color:var(--red)}
input,select,textarea{width:100%;padding:9px 12px;border:1px solid var(--border);border-radius:var(--radius);font-family:var(--font-body);font-size:14px;color:var(--dark);background:white;transition:border-color .15s;outline:none}
input:focus,select:focus,textarea:focus{border-color:var(--red);box-shadow:0 0 0 3px rgba(192,57,43,.08)}
select{appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2712%27 height=%278%27 viewBox=%270 0 12 8%27%3E%3Cpath d=%27M1 1l5 5 5-5%27 stroke=%27%23999%27 stroke-width=%271.5%27 fill=%27none%27/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center}
textarea{resize:vertical;min-height:80px}
.check-group{display:flex;align-items:flex-start;gap:10px;padding:12px 14px;border:1px solid var(--border);border-radius:var(--radius);cursor:pointer;transition:border-color .15s}
.check-group:hover{border-color:#bbb}
.check-group input[type="checkbox"]{width:16px;height:16px;flex-shrink:0;margin-top:2px;accent-color:var(--red)}
.check-group .check-text{font-size:13px;color:var(--mid);line-height:1.5}
.check-group .check-text strong{color:var(--dark)}
.summary-box{background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);padding:1.25rem}
.summary-row{display:flex;justify-content:space-between;align-items:center;font-size:14px;padding:5px 0;border-bottom:1px solid #ececec}
.summary-row:last-child{border:none;margin-top:6px;padding-top:10px;font-weight:600;font-size:15px}
.summary-row .label{color:var(--muted)}
.payment-methods{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:1.25rem}
.success-screen{text-align:center;padding:2rem 1rem}
.success-icon{width:64px;height:64px;background:var(--red-bg);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 1.5rem}
.success-icon svg{width:30px;height:30px;stroke:var(--red);fill:none;stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round}
.success-title{font-family:var(--font-display);font-size:32px;letter-spacing:1px;margin-bottom:8px}
.success-sub{font-size:15px;color:var(--muted);max-width:360px;margin:0 auto 1.5rem;line-height:1.6}
.recap-card{background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);padding:1rem 1.25rem;text-align:left;margin-bottom:1.5rem;font-size:13px}
.recap-card .recap-row{display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #ececec}
.recap-card .recap-row:last-child{border:none}
.recap-card .recap-label{color:var(--muted)}
.modal-footer{padding:1rem 2rem 1.5rem;display:flex;align-items:center;justify-content:space-between;gap:12px;border-top:1px solid #f0f0f0}
.btn-nav{font-family:var(--font-body);font-size:14px;font-weight:500;padding:10px 20px;border-radius:7px;cursor:pointer;transition:all .15s;border:none}
.btn-back{background:white;color:var(--mid);border:1px solid var(--border)}
.btn-back:hover{background:var(--bg)}
.btn-next{background:var(--red);color:white}
.btn-next:hover{background:var(--red-dark)}
.btn-next:disabled{background:#ccc;cursor:not-allowed}
.info-alert{background:#EBF5FB;border-left:3px solid #2980B9;padding:10px 14px;border-radius:4px;font-size:13px;color:#1A5276;margin-bottom:1.25rem;line-height:1.5}

/* FOOTER */
footer{margin-top:4rem;background:var(--dark);color:#666;text-align:center;padding:1.5rem;font-size:12px}
footer span{color:#888}

/* ADMIN PANEL */
.admin-overlay{position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:2000;display:none;align-items:center;justify-content:center;padding:1rem;backdrop-filter:blur(4px)}
.admin-overlay.open{display:flex}
.admin-login-box{background:white;border-radius:var(--radius-lg);width:100%;max-width:380px;overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,.3)}
.admin-login-header{background:var(--dark);padding:1.5rem 2rem;text-align:center}
.admin-login-header .shield{width:44px;height:44px;background:var(--red);border-radius:10px;display:flex;align-items:center;justify-content:center;margin:0 auto 12px}
.admin-login-header .shield svg{width:24px;height:24px;fill:white}
.admin-login-title{font-family:var(--font-display);font-size:22px;color:white;letter-spacing:1px}
.admin-login-sub{font-size:13px;color:#777;margin-top:4px}
.admin-login-body{padding:1.75rem 2rem}
.admin-login-error{background:#FDEDEC;border:1px solid #F1948A;border-radius:6px;padding:10px 14px;font-size:13px;color:#922B21;margin-bottom:1rem;display:none}
.admin-panel{background:#f4f4f4;min-height:100vh;position:fixed;inset:0;z-index:2000;display:none;flex-direction:column;overflow:hidden}
.admin-panel.open{display:flex}
.admin-topbar{background:var(--dark);color:white;padding:0 2rem;display:flex;align-items:center;justify-content:space-between;height:60px;flex-shrink:0}
.admin-topbar-left{display:flex;align-items:center;gap:12px}
.admin-topbar-logo{font-family:var(--font-display);font-size:18px;letter-spacing:1px}
.admin-topbar-badge{font-size:11px;background:var(--red);color:white;padding:3px 10px;border-radius:20px;font-weight:600}
.admin-topbar-right{display:flex;align-items:center;gap:10px}
.admin-btn-quit{font-family:var(--font-body);font-size:13px;padding:6px 14px;border-radius:6px;border:1px solid #444;background:transparent;color:#aaa;cursor:pointer;transition:all .15s}
.admin-btn-quit:hover{background:#C0392B;border-color:#C0392B;color:white}
.admin-content{flex:1;overflow-y:auto;padding:2rem}
.admin-inner{max-width:960px;margin:0 auto}
.admin-section-title{font-family:var(--font-display);font-size:28px;letter-spacing:1px;margin-bottom:6px}
.admin-section-sub{font-size:14px;color:var(--muted);margin-bottom:2rem}
.admin-toolbar{display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem;flex-wrap:wrap;gap:10px}
.btn-add-event{font-family:var(--font-body);font-size:14px;font-weight:600;padding:10px 20px;border-radius:8px;border:none;background:var(--red);color:white;cursor:pointer;display:flex;align-items:center;gap:8px;transition:background .15s}
.btn-add-event:hover{background:var(--red-dark)}
.admin-events-list{display:flex;flex-direction:column;gap:12px}
.admin-event-row{background:white;border:1px solid var(--border);border-radius:var(--radius-lg);padding:16px 20px;display:flex;align-items:center;gap:16px;transition:box-shadow .15s}
.admin-event-row:hover{box-shadow:0 4px 16px rgba(0,0,0,.07)}
.admin-event-row.sold-out{opacity:.6}
.admin-event-color{width:4px;height:52px;border-radius:4px;flex-shrink:0}
.admin-event-info{flex:1;min-width:0}
.admin-event-name{font-family:var(--font-display);font-size:18px;letter-spacing:.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.admin-event-meta{font-size:12px;color:var(--muted);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.admin-event-badges{display:flex;align-items:center;gap:8px;flex-shrink:0}
.admin-price-tag{font-family:var(--font-display);font-size:20px;color:var(--dark);flex-shrink:0;min-width:60px;text-align:right}
.admin-actions{display:flex;gap:8px;flex-shrink:0}
.admin-btn-edit,.admin-btn-del{font-family:var(--font-body);font-size:12px;font-weight:600;padding:7px 14px;border-radius:6px;cursor:pointer;transition:all .15s;border:none}
.admin-btn-edit{background:#EBF5FB;color:#1A5276;border:1px solid #AED6F1}
.admin-btn-edit:hover{background:#2980B9;color:white;border-color:#2980B9}
.admin-btn-del{background:#FDEDEC;color:#922B21;border:1px solid #F1948A}
.admin-btn-del:hover{background:var(--red);color:white;border-color:var(--red)}
.admin-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:3000;display:none;align-items:center;justify-content:center;padding:1rem;backdrop-filter:blur(3px)}
.admin-modal-overlay.open{display:flex}
.admin-modal{background:white;border-radius:var(--radius-lg);width:100%;max-width:640px;max-height:92vh;overflow-y:auto;box-shadow:0 24px 60px rgba(0,0,0,.25)}
.admin-modal-header{background:var(--dark);color:white;padding:1.25rem 1.75rem;display:flex;align-items:center;justify-content:space-between;border-radius:var(--radius-lg) var(--radius-lg) 0 0;position:sticky;top:0;z-index:10}
.admin-modal-title{font-family:var(--font-display);font-size:22px;letter-spacing:1px}
.admin-modal-close{background:none;border:none;color:#777;font-size:20px;cursor:pointer;padding:4px 8px;line-height:1}
.admin-modal-close:hover{color:white}
.admin-modal-body{padding:1.75rem}
.admin-form-section{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin:1.5rem 0 .75rem;padding-bottom:6px;border-bottom:1px solid var(--border)}
.admin-form-section:first-child{margin-top:0}
.admin-toggle-group{display:flex;gap:8px;flex-wrap:wrap}
.admin-toggle-btn{font-family:var(--font-body);font-size:13px;font-weight:500;padding:7px 16px;border-radius:20px;border:2px solid var(--border);background:white;color:var(--muted);cursor:pointer;transition:all .15s}
.admin-toggle-btn.active{border-color:var(--red);background:#FEF5F5;color:#8B0000;font-weight:600}
.admin-modal-footer{padding:1.25rem 1.75rem;border-top:1px solid #f0f0f0;display:flex;justify-content:flex-end;gap:10px}
.btn-save{font-family:var(--font-body);font-size:14px;font-weight:600;padding:10px 24px;border-radius:7px;border:none;background:var(--red);color:white;cursor:pointer;transition:background .15s}
.btn-save:hover{background:var(--red-dark)}
.btn-cancel{font-family:var(--font-body);font-size:14px;font-weight:500;padding:10px 20px;border-radius:7px;border:1px solid var(--border);background:white;color:var(--mid);cursor:pointer;transition:background .15s}
.btn-cancel:hover{background:#f8f8f8}
.confirm-overlay{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:4000;display:none;align-items:center;justify-content:center;padding:1rem;backdrop-filter:blur(3px)}
.confirm-overlay.open{display:flex}
.confirm-box{background:white;border-radius:var(--radius-lg);max-width:400px;width:100%;padding:2rem;text-align:center;box-shadow:0 20px 50px rgba(0,0,0,.2)}
.confirm-icon{font-size:40px;margin-bottom:1rem}
.confirm-title{font-family:var(--font-display);font-size:22px;letter-spacing:.5px;margin-bottom:8px}
.confirm-msg{font-size:14px;color:var(--muted);line-height:1.6;margin-bottom:1.5rem}
.confirm-btns{display:flex;gap:10px;justify-content:center}
.admin-empty{text-align:center;padding:3rem 1rem;color:var(--muted)}
.admin-empty-icon{font-size:48px;margin-bottom:1rem;opacity:.5}
.admin-spots-badge{font-size:11px;font-weight:600;padding:3px 9px;border-radius:20px}
.spots-ok{background:#EAFAF1;color:#1E8449}
.spots-low{background:#FEF9E7;color:#B7770D}
.spots-full{background:#f5f5f5;color:#999}

/* ADMIN TABS */
.admin-tabs{display:flex;gap:4px;margin-bottom:2rem;background:#e8e8e8;padding:4px;border-radius:10px;width:fit-content}
.admin-tab{font-family:var(--font-body);font-size:13px;font-weight:600;padding:8px 20px;border-radius:7px;border:none;background:transparent;color:#888;cursor:pointer;transition:all .15s}
.admin-tab.active{background:white;color:var(--dark);box-shadow:0 1px 4px rgba(0,0,0,.1)}

/* REGISTRATIONS TABLE */
.reg-filter-bar{display:flex;gap:8px;margin-bottom:1.25rem;flex-wrap:wrap;align-items:center}
.reg-filter-select{font-family:var(--font-body);font-size:13px;padding:7px 12px;border:1px solid var(--border);border-radius:7px;background:white;color:var(--dark);cursor:pointer}
.reg-count{font-size:13px;color:var(--muted);margin-left:auto}
.reg-table-wrap{overflow-x:auto;border:1px solid var(--border);border-radius:var(--radius-lg);background:white}
.reg-table{width:100%;border-collapse:collapse;font-size:13px}
.reg-table th{background:#f8f8f8;padding:10px 14px;text-align:left;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);border-bottom:1px solid var(--border);white-space:nowrap}
.reg-table td{padding:10px 14px;border-bottom:1px solid #f2f2f2;vertical-align:middle}
.reg-table tr:last-child td{border-bottom:none}
.reg-table tr:hover td{background:#fafafa}
.reg-status{font-size:11px;font-weight:600;padding:3px 9px;border-radius:20px;white-space:nowrap}
.reg-status.gratuit{background:#EAFAF1;color:#1E8449}
.reg-status.paye{background:#EAFAF1;color:#1E8449}
.reg-status.en_attente{background:#FEF9E7;color:#B7770D}
.reg-status.annule{background:#f5f5f5;color:#999}
.btn-del-reg{font-family:var(--font-body);font-size:11px;font-weight:600;padding:5px 10px;border-radius:5px;border:none;background:#FDEDEC;color:#922B21;cursor:pointer;transition:all .15s;white-space:nowrap}
.btn-del-reg:hover{background:var(--red);color:white}
.reg-empty{text-align:center;padding:2.5rem;color:var(--muted);font-size:14px}

/* RESPONSIVE */
@media(max-width:580px){
  .form-row{grid-template-columns:1fr}
  .events-grid{grid-template-columns:1fr}
  .modal{max-height:100vh;border-radius:0;height:100vh}
  .modal-header{border-radius:0}
  .modal-event-title{font-size:22px}
  .payment-methods{grid-template-columns:1fr}
}
</style>
</head>
<body>

<header>
  <div class="header-inner">
    <div class="logo">
      <div class="logo-icon">
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2zm0 4.5l5.25 2.88v2.5c0 3.3-2.33 6.38-5.25 7.47V6.5z"/></svg>
      </div>
      <div>
        <div class="logo-name">American Full Fighting</div>
        <div class="logo-season">Bons-en-Chablais · FFK</div>
      </div>
    </div>
    <div style="display:flex;align-items:center;gap:10px">
      <div class="header-badge">Saison 2025–2026</div>
      <button onclick="openAdminLogin()" style="font-family:var(--font-body);font-size:12px;padding:4px 12px;border-radius:20px;border:1px solid #444;background:transparent;color:#888;cursor:pointer;transition:all .15s" onmouseover="this.style.borderColor='#C0392B';this.style.color='#C0392B'" onmouseout="this.style.borderColor='#444';this.style.color='#888'">⚙ Admin</button>
    </div>
  </div>
</header>

<div class="hero">
  <div class="hero-inner">
    <h1>ÉVÉNEMENTS<br><span>& STAGES</span></h1>
    <p>Inscrivez-vous aux événements du club — stages, compétitions et séminaires.</p>
  </div>
</div>

<div class="filters-bar">
  <div class="filters-inner">
    <button class="filter-btn active" onclick="filterCards('tous',this)">Tous</button>
    <button class="filter-btn" onclick="filterCards('stage',this)">Stages</button>
    <button class="filter-btn" onclick="filterCards('competition',this)">Compétitions</button>
    <button class="filter-btn" onclick="filterCards('seminaire',this)">Séminaires</button>
    <button class="filter-btn" onclick="filterCards('grade',this)">Passages de grade</button>
    <button class="filter-btn" onclick="filterCards('gratuit',this)">Gratuit</button>
  </div>
</div>

<div class="events-section">
  <div class="section-label">Prochains événements</div>
  <div class="events-grid" id="events-grid">
    <div style="grid-column:1/-1;text-align:center;padding:3rem;color:#999;font-size:14px">Chargement des événements…</div>
  </div>
</div>

<!-- MODAL -->
<div class="modal-overlay" id="modal-overlay" onclick="maybeClose(event)">
  <div class="modal" id="modal">
    <div class="modal-header">
      <button class="modal-close" onclick="closeModal()" aria-label="Fermer">✕</button>
      <div class="modal-event-title" id="modal-title">Titre de l'événement</div>
      <div class="modal-event-sub" id="modal-sub">Sous-titre</div>
      <div class="progress-bar"><div class="progress-fill" id="progress-fill" style="width:25%"></div></div>
      <div class="progress-steps">
        <span class="progress-step active" id="ps1">01 · Identité</span>
        <span class="progress-step" id="ps2">02 · Détails</span>
        <span class="progress-step" id="ps3">03 · Récapitulatif</span>
        <span class="progress-step" id="ps4">04 · Paiement</span>
      </div>
    </div>

    <div class="modal-body">
      <!-- STEP 1 -->
      <div class="step active" id="step-1">
        <div class="step-title">Informations personnelles</div>
        <div class="step-desc">Renseignez les coordonnées du participant à l'événement.</div>
        <div class="form-row">
          <div class="form-group">
            <label for="f-nom">Nom <span class="req">*</span></label>
            <input type="text" id="f-nom" placeholder="DUPONT">
          </div>
          <div class="form-group">
            <label for="f-prenom">Prénom <span class="req">*</span></label>
            <input type="text" id="f-prenom" placeholder="Léa">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="f-dob">Date de naissance <span class="req">*</span></label>
            <input type="date" id="f-dob">
          </div>
          <div class="form-group">
            <label for="f-tel">Téléphone <span class="req">*</span></label>
            <input type="tel" id="f-tel" placeholder="06 00 00 00 00">
          </div>
        </div>
        <div class="form-group">
          <label for="f-email">Email <span class="req">*</span></label>
          <input type="email" id="f-email" placeholder="lea.dupont@example.fr">
        </div>
        <div class="form-group">
          <label for=\"f-licence\">Numéro de licence fédérale</label>
          <input type="text" id="f-licence" placeholder="FFK-XXXXXXXX (si applicable)">
        </div>
        <div class="check-group" style="margin-top:.5rem">
          <input type="checkbox" id="f-mineur">
          <div class="check-text"><strong>Participant mineur</strong> — une autorisation parentale sera requise à l'étape suivante.</div>
        </div>
      </div>

      <!-- STEP 2 -->
      <div class="step" id="step-2">
        <div class="step-title">Détails & informations complémentaires</div>
        <div class="step-desc">Précisez les informations nécessaires à l'organisation.</div>
        <div class="form-group">
          <label for="f-categorie">Catégorie de poids / Catégorie d'âge</label>
          <select id="f-categorie">
            <option value="">— Sélectionner —</option>
            <option>Benjamin (-12 ans)</option>
            <option>Minime (12–13 ans)</option>
            <option>Cadet (14–15 ans)</option>
            <option>Junior (16–17 ans)</option>
            <option>Senior (18–39 ans)</option>
            <option>Vétéran (40 ans et +)</option>
          </select>
        </div>
        <div id="grade-section" style="display:none">
          <div class="info-alert">Passage de grade — précisez votre ceinture actuelle et la ceinture visée.</div>
          <div class="form-row">
            <div class="form-group">
              <label for="f-ceinture-actuelle">Ceinture actuelle <span class="req">*</span></label>
              <select id="f-ceinture-actuelle">
                <option value="">— Sélectionner —</option>
                <option>Blanche</option><option>Blanche–Jaune</option><option>Jaune</option>
                <option>Jaune–Orange</option><option>Orange</option><option>Orange–Verte</option>
                <option>Verte</option><option>Bleue</option><option>Marron</option>
              </select>
            </div>
            <div class="form-group">
              <label for="f-ceinture-visee">Ceinture visée <span class="req">*</span></label>
              <select id="f-ceinture-visee">
                <option value="">— Sélectionner —</option>
                <option>Blanche–Jaune</option><option>Jaune</option>
                <option>Jaune–Orange</option><option>Orange</option><option>Orange–Verte</option>
                <option>Verte</option><option>Bleue</option><option>Marron</option><option>Noire</option>
              </select>
            </div>
          </div>
        </div>
        <div class="form-group">
          <label for=\"f-niveau\">Niveau pratique</label>
          <select id="f-niveau">
            <option value="">— Sélectionner —</option>
            <option>Débutant (moins d'1 an)</option>
            <option>Intermédiaire (1–3 ans)</option>
            <option>Confirmé (3–5 ans)</option>
            <option>Expert (5 ans et +)</option>
          </select>
        </div>
        <div class="form-group">
          <label for="f-regime">Régime alimentaire / Allergie (optionnel)</label>
          <input type="text" id="f-regime" placeholder="Ex : végétarien, allergie aux arachides…">
        </div>
        <div id="mineur-section" style="display:none">
          <div class="info-alert">Ce participant est mineur — le représentant légal doit valider l'inscription.</div>
          <div class="form-row">
            <div class="form-group">
              <label for="f-parent-nom">Nom du représentant légal <span class="req">*</span></label>
              <input type="text" id="f-parent-nom" placeholder="DUPONT">
            </div>
            <div class="form-group">
              <label for="f-parent-prenom">Prénom <span class="req">*</span></label>
              <input type="text" id="f-parent-prenom" placeholder="Marie">
            </div>
          </div>
          <div class="form-group">
            <label for="f-parent-tel">Téléphone représentant légal <span class="req">*</span></label>
            <input type="tel" id="f-parent-tel" placeholder="06 00 00 00 00">
          </div>
        </div>
        <div class="form-group" style="margin-top:.5rem">
          <label for="f-message">Message / remarque pour l'organisateur (optionnel)</label>
          <textarea id="f-message" placeholder="Informations utiles pour l'organisation…"></textarea>
        </div>
        <div class="check-group">
          <input type="checkbox" id="f-certif">
          <div class="check-text"><strong>Je certifie</strong> être titulaire d'un certificat médical de non contre-indication à la pratique du sport de combat, ou m'engage à en fournir un avant l'événement si requis.</div>
        </div>
      </div>

      <!-- STEP 3 -->
      <div class="step" id="step-3">
        <div class="step-title">Récapitulatif de l'inscription</div>
        <div class="step-desc">Vérifiez les informations avant de procéder au paiement.</div>
        <div class="summary-box" id="summary-content"></div>
        <div class="check-group" style="margin-top:1rem">
          <input type="checkbox" id="f-reglement">
          <div class="check-text"><strong>J'accepte le règlement intérieur</strong> du club et reconnais avoir pris connaissance des conditions de participation à cet événement.</div>
        </div>
        <div class="check-group" style="margin-top:8px">
          <input type="checkbox" id="f-image">
          <div class="check-text"><strong>J'autorise</strong> le club à diffuser des photos et vidéos prises lors de l'événement sur ses supports de communication (site web, réseaux sociaux).</div>
        </div>
      </div>

      <!-- STEP 4 -->
      <div class="step" id="step-4">
        <div class="step-title">Paiement</div>
        <div class="step-desc">Finalisez votre inscription en procédant au paiement sécurisé.</div>
        <div id="paiement-free-msg" style="display:none">
          <div class="info-alert">Cet événement est <strong>gratuit</strong>. Aucun paiement requis — validez simplement votre inscription.</div>
        </div>
        <div id="paiement-options" style="display:none">
          <div style="background:#FEF5F5;border:2px solid #F1948A;border-radius:var(--radius);padding:16px 20px;margin-bottom:20px;display:flex;align-items:center;justify-content:space-between">
            <div>
              <div style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#922B21;margin-bottom:2px">Montant à régler</div>
              <div style="font-family:var(--font-display);font-size:32px;color:var(--dark)" id="ha-montant-label">—</div>
            </div>
            <div style="text-align:right">
              <div style="font-size:11px;color:var(--muted);margin-bottom:4px">Paiement sécurisé via</div>
              <div style="background:#FF5F00;color:white;font-size:12px;font-weight:700;padding:4px 12px;border-radius:20px">HelloAsso</div>
            </div>
          </div>
          <div style="text-align:center;padding:8px 0 16px">
            <button id="btn-open-helloasso" onclick="openHelloAsso()" style="font-family:var(--font-body);font-size:15px;font-weight:700;padding:14px 32px;border-radius:10px;border:none;cursor:pointer;background:#FF5F00;color:white;width:100%;max-width:360px;display:inline-flex;align-items:center;justify-content:center;gap:10px;transition:background .15s;box-shadow:0 4px 14px rgba(255,95,0,.3)" onmouseover="this.style.background='#e65500'" onmouseout="this.style.background='#FF5F00'">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              Payer sur HelloAsso
            </button>
            <p style="font-size:12px;color:var(--muted);margin-top:10px;line-height:1.6">Une nouvelle fenêtre s'ouvrira sur la page de paiement HelloAsso.<br><strong>Revenez ici après paiement</strong> et cochez la case ci-dessous pour valider.</p>
          </div>
          <div style="border:1px solid var(--border);border-radius:var(--radius);padding:14px 16px;background:#fafafa">
            <div style="font-size:13px;font-weight:600;color:var(--dark);margin-bottom:10px">✅ Paiement effectué sur HelloAsso ?</div>
            <div class="check-group">
              <input type="checkbox" id="f-paiement-ok">
              <div class="check-text">Je confirme avoir réalisé mon paiement sur HelloAsso et souhaite valider mon inscription.</div>
            </div>
          </div>
        </div>
      </div>
    </div><!-- end modal-body -->

    <div class="modal-footer">
      <button class="btn-nav btn-back" id="btn-back" onclick="prevStep()" style="visibility:hidden">← Retour</button>
      <button class="btn-nav btn-next" id="btn-next" onclick="nextStep()">Continuer →</button>
    </div>
  </div>
</div>

<footer>
  <span>American Full Fighting Bons-en-Chablais · FFK · Saison 2025–2026</span><br>
  Tous les paiements sont sécurisés via HelloAsso · Données traitées conformément au RGPD
</footer>

<!-- ADMIN LOGIN OVERLAY -->
<div class="admin-overlay" id="admin-login-overlay">
  <div class="admin-login-box">
    <div class="admin-login-header">
      <div class="shield">
        <svg viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5L12 1zm0 4.5l5 2.72V11c0 3.18-2.19 6.15-5 7.18-2.81-1.03-5-4-5-7.18V8.22L12 5.5z"/></svg>
      </div>
      <div class="admin-login-title">ESPACE ADMIN</div>
      <div class="admin-login-sub">American Full Fighting · Bons-en-Chablais</div>
    </div>
    <div class="admin-login-body">
      <div class="admin-login-error" id="login-error">Mot de passe incorrect. Réessayez.</div>
      <div class="form-group">
        <label for="admin-pw">Mot de passe administrateur <span class="req">*</span></label>
        <input type="password" id="admin-pw" placeholder="••••••••" onkeydown="if(event.key==='Enter')checkAdminLogin()">
      </div>
      <button class="btn-save" style="width:100%;margin-top:.5rem" onclick="checkAdminLogin()">Accéder au panneau →</button>
      <button class="btn-cancel" style="width:100%;margin-top:8px" onclick="closeAdminLogin()">Annuler</button>
    </div>
  </div>
</div>

<!-- ADMIN PANEL -->
<div class="admin-panel" id="admin-panel">
  <div class="admin-topbar">
    <div class="admin-topbar-left">
      <div class="admin-topbar-logo">PANNEAU ADMIN</div>
      <div class="admin-topbar-badge">⚙ Mode administrateur</div>
    </div>
    <div class="admin-topbar-right">
      <span style="font-size:12px;color:#666">Connecté en tant qu'admin</span>
      <button class="admin-btn-quit" onclick="quitAdmin()">Quitter ✕</button>
    </div>
  </div>
  <div class="admin-content">
    <div class="admin-inner">
      <div class="admin-tabs">
        <button class="admin-tab active" id="tab-events" onclick="switchAdminTab('events')">📅 Événements</button>
        <button class="admin-tab" id="tab-regs" onclick="switchAdminTab('regs')">👥 Inscriptions</button>
      </div>

      <!-- ONGLET ÉVÉNEMENTS -->
      <div id="admin-pane-events">
        <div class="admin-section-title">GESTION DES ÉVÉNEMENTS</div>
        <div class="admin-section-sub">Créez, modifiez ou supprimez les événements affichés sur la page d'inscription.</div>
        <div id="admin-config-status" style="margin-bottom:1.5rem"></div>
        <div class="admin-toolbar">
          <div style="font-size:13px;color:var(--muted)"><span id="admin-event-count">0</span> événement(s) au total</div>
          <div style="display:flex;gap:8px;align-items:center">
            <button class="btn-add-event" onclick="openEventForm(null)">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Nouvel événement
            </button>
          </div>
        </div>
        <div class="admin-events-list" id="admin-events-list"></div>
      </div>

      <!-- ONGLET INSCRIPTIONS -->
      <div id="admin-pane-regs" style="display:none">
        <div class="admin-section-title">INSCRIPTIONS</div>
        <div class="admin-section-sub">Consultez et gérez toutes les inscriptions enregistrées.</div>
        <div class="reg-filter-bar">
          <select class="reg-filter-select" id="reg-filter-event" onchange="loadRegistrations()">
            <option value="">Tous les événements</option>
          </select>
          <select class="reg-filter-select" id="reg-filter-status" onchange="loadRegistrations()">
            <option value="">Tous les statuts</option>
            <option value="en_attente">En attente</option>
            <option value="paye">Payé</option>
            <option value="gratuit">Gratuit</option>
            <option value="annule">Annulé</option>
          </select>
          <span class="reg-count" id="reg-count"></span>
        </div>
        <div id="reg-table-container"><div class="reg-empty">Chargement…</div></div>
      </div>

    </div>
  </div>
</div>

<!-- ADMIN EVENT FORM MODAL -->
<div class="admin-modal-overlay" id="admin-event-modal">
  <div class="admin-modal">
    <div class="admin-modal-header">
      <div class="admin-modal-title" id="admin-modal-title">NOUVEL ÉVÉNEMENT</div>
      <button class="admin-modal-close" onclick="closeEventForm()">✕</button>
    </div>
    <div class="admin-modal-body">
      <input type="hidden" id="ae-id">
      <div class="admin-form-section">Informations générales</div>
      <div class="form-group">
        <label for=\"ae-title\">Titre de l'événement <span class=\"req\">*</span></label>
        <input type="text" id="ae-title" placeholder="Ex : Stage Été — Frappe & Déplacement">
      </div>
      <div class="form-group">
        <label for="ae-sub">Sous-titre / description courte <span class="req">*</span></label>
        <input type="text" id="ae-sub" placeholder="Ex : Tous niveaux · 2 jours intensifs">
      </div>
      <div class="form-group">
        <label for="ae-type-group">Type d'événement <span class="req">*</span></label>
        <div class="admin-toggle-group" id="ae-type-group">
          <button class="admin-toggle-btn" data-val="stage" onclick="selectToggle('ae-type-group',this)">Stage</button>
          <button class="admin-toggle-btn" data-val="competition" onclick="selectToggle('ae-type-group',this)">Compétition</button>
          <button class="admin-toggle-btn" data-val="seminaire" onclick="selectToggle('ae-type-group',this)">Séminaire</button>
          <button class="admin-toggle-btn" data-val="grade" onclick="selectToggle('ae-type-group',this)">Passage de grade</button>
        </div>
      </div>
      <div class="admin-form-section">Date, lieu & horaires</div>
      <div class="form-row">
        <div class="form-group">
          <label for="ae-date-start">Date de début <span class="req">*</span></label>
          <input type="date" id="ae-date-start">
        </div>
        <div class="form-group">
          <label for=\"ae-date-end\">Date de fin (si plusieurs jours)</label>
          <input type="date" id="ae-date-end">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label for="ae-time-start">Heure de début <span class="req">*</span></label>
          <input type="time" id="ae-time-start">
        </div>
        <div class="form-group">
          <label for="ae-time-end">Heure de fin <span class="req">*</span></label>
          <input type="time" id="ae-time-end">
        </div>
      </div>
      <div class="form-group">
        <label for="ae-lieu">Lieu <span class="req">*</span></label>
        <input type="text" id="ae-lieu" placeholder="Ex : Dojo du club, Bons-en-Chablais">
      </div>
      <div class="admin-form-section">Tarif & places</div>
      <div class="form-row">
        <div class="form-group">
          <label for="ae-price">Prix (€) — 0 = gratuit <span class="req">*</span></label>
          <input type="number" id="ae-price" min="0" step="1" placeholder="0">
        </div>
        <div class="form-group">
          <label for="ae-spots">Nombre de places disponibles <span class="req">*</span></label>
          <input type="number" id="ae-spots" min="0" step="1" placeholder="20">
        </div>
      </div>
      <div class="admin-form-section">Statut & options</div>
      <div class="form-group">
        <label for=\"ae-status-group\">Statut</label>
        <div class="admin-toggle-group" id="ae-status-group">
          <button class="admin-toggle-btn active" data-val="disponible" onclick="selectToggle('ae-status-group',this)">Disponible</button>
          <button class="admin-toggle-btn" data-val="complet" onclick="selectToggle('ae-status-group',this)">Complet</button>
        </div>
      </div>
      <div class="form-group" style="margin-top:.75rem">
        <div class="check-group">
          <input type="checkbox" id="ae-featured">
          <div class="check-text"><strong>Événement mis en avant</strong> — affichera une bordure rouge sur la carte.</div>
        </div>
      </div>
      <div class="form-group" style="margin-top:.75rem">
        <div class="check-group">
          <input type="checkbox" id="ae-isGrade">
          <div class="check-text"><strong>Passage de grade</strong> — affiche les champs ceinture dans le formulaire d'inscription.</div>
        </div>
      </div>
      <div class="admin-form-section">Paiement HelloAsso (optionnel)</div>
      <div class="form-group">
        <div class="check-group">
          <input type="checkbox" id="ae-helloasso" onchange="toggleHAUrl()">
          <div class="check-text"><strong>Activer HelloAsso</strong> — affiche le bouton de paiement en ligne.</div>
        </div>
      </div>
      <div class="form-group" id="ae-ha-url-group" style="display:none;margin-top:.5rem">
        <label for=\"ae-helloasso-url\">URL HelloAsso</label>
        <input type="url" id="ae-helloasso-url" placeholder="https://www.helloasso.com/associations/...">
      </div>
    </div>
    <div class="admin-modal-footer">
      <button class="btn-cancel" onclick="closeEventForm()">Annuler</button>
      <button class="btn-save" onclick="saveEvent()">Enregistrer l'événement ✓</button>
    </div>
  </div>
</div>

<!-- CONFIRM DELETE -->
<div class="confirm-overlay" id="confirm-overlay">
  <div class="confirm-box">
    <div class="confirm-icon">🗑️</div>
    <div class="confirm-title">SUPPRIMER CET ÉVÉNEMENT ?</div>
    <div class="confirm-msg" id="confirm-msg">Cette action est irréversible.</div>
    <div class="confirm-btns">
      <button class="btn-cancel" onclick="closeConfirm()">Annuler</button>
      <button class="btn-save" style="background:#C0392B" id="confirm-yes-btn">Supprimer</button>
    </div>
  </div>
</div>

<script>
const CONFIG = {
  BREVO_API_KEY: '',
  CLUB_EMAIL: 'fullfightingbons@gmail.com',
  CLUB_NAME: 'American Full Fighting Bons-en-Chablais',
  API_URL: window.location.origin
};

const API = {
  _token: null,
  async get(path) {
    const r = await fetch(CONFIG.API_URL + path);
    if (!r.ok) throw new Error((await r.json()).error || r.statusText);
    return r.json();
  },
  async post(path, body) {
    const r = await fetch(CONFIG.API_URL + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!r.ok) throw new Error((await r.json()).error || r.statusText);
    return r.json();
  },
  async adminPost(path, body) {
    const r = await fetch(CONFIG.API_URL + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + API._token },
      body: JSON.stringify(body)
    });
    if (!r.ok) throw new Error((await r.json()).error || r.statusText);
    return r.json();
  },
  async adminPut(path, body) {
    const r = await fetch(CONFIG.API_URL + path, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + API._token },
      body: JSON.stringify(body)
    });
    if (!r.ok) throw new Error((await r.json()).error || r.statusText);
    return r.json();
  },
  async adminDelete(path) {
    const r = await fetch(CONFIG.API_URL + path, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + API._token }
    });
    if (!r.ok) throw new Error((await r.json()).error || r.statusText);
    return r.json();
  }
};

let events = {};
let currentEvent = null, currentStep = 1;

function filterCards(type, btn) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.event-card').forEach(card => {
    if (type === 'tous') { card.style.display = ''; }
    else if (type === 'gratuit') { card.style.display = card.querySelector('.free') ? '' : 'none'; }
    else { card.style.display = card.dataset.type && card.dataset.type.includes(type) ? '' : 'none'; }
  });
}

function openModal(eventId) {
  currentEvent = { ...events[eventId], id: eventId };
  currentStep = 1;
  document.getElementById('modal-title').textContent = currentEvent.title;
  document.getElementById('modal-sub').textContent = currentEvent.sub;
  updateStepUI();
  document.getElementById('modal-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

function maybeClose(e) {
  if (e.target === document.getElementById('modal-overlay')) closeModal();
}

function updateStepUI() {
  for (let i = 1; i <= 4; i++) {
    const s = document.getElementById('step-' + i);
    const ps = document.getElementById('ps' + i);
    if (s) s.classList.toggle('active', i === currentStep);
    if (ps) ps.classList.toggle('active', i === currentStep);
  }
  document.getElementById('progress-fill').style.width = (currentStep / 4 * 100) + '%';
  document.getElementById('btn-back').style.visibility = currentStep > 1 ? 'visible' : 'hidden';
  const btnNext = document.getElementById('btn-next');
  btnNext.textContent = currentStep === 4 ? "Confirmer l'inscription ✓" : 'Continuer →';
  document.getElementById('mineur-section').style.display = document.getElementById('f-mineur').checked ? 'block' : 'none';
  const gradeSection = document.getElementById('grade-section');
  if (gradeSection) gradeSection.style.display = (currentEvent && currentEvent.isGrade) ? 'block' : 'none';
  if (currentStep === 3) buildSummary();
  if (currentStep === 4) setupPaymentStep();
}

function buildSummary() {
  const nom = (document.getElementById('f-nom').value || '—').toUpperCase();
  const prenom = document.getElementById('f-prenom').value || '—';
  const dob = document.getElementById('f-dob').value || '—';
  const email = document.getElementById('f-email').value || '—';
  const cat = document.getElementById('f-categorie').value || 'Non renseigné';
  const prix = currentEvent.price === 0 ? 'Gratuit' : '€' + currentEvent.price;
  document.getElementById('summary-content').innerHTML =
    '<div class="summary-row"><span class="label">Événement</span><span>' + currentEvent.title + '</span></div>' +
    '<div class="summary-row"><span class="label">Participant</span><span>' + nom + ' ' + prenom + '</span></div>' +
    '<div class="summary-row"><span class="label">Date de naissance</span><span>' + dob + '</span></div>' +
    '<div class="summary-row"><span class="label">Email</span><span>' + email + '</span></div>' +
    '<div class="summary-row"><span class="label">Catégorie</span><span>' + cat + '</span></div>' +
    '<div class="summary-row"><span class="label">Montant total</span><span style="font-weight:600;color:var(--red)">' + prix + '</span></div>';
}

function setupPaymentStep() {
  const isFree = currentEvent.price === 0;
  document.getElementById('paiement-free-msg').style.display = isFree ? 'block' : 'none';
  document.getElementById('paiement-options').style.display = isFree ? 'none' : 'block';
  if (!isFree) {
    document.getElementById('ha-montant-label').textContent = '€' + currentEvent.price;
    const cb = document.getElementById('f-paiement-ok');
    if (cb) cb.checked = false;
  }
}

async function openHelloAsso() {
  const btn = document.getElementById('btn-open-helloasso');
  btn.disabled = true;
  btn.textContent = 'Redirection en cours...';
  try {
    const result = await API.post('/api/checkout', {
      event_id: currentEvent.id,
      nom:      (document.getElementById('f-nom').value || '').toUpperCase(),
      prenom:   document.getElementById('f-prenom').value,
      email:    document.getElementById('f-email').value,
    });
    window.location.href = result.redirectUrl;
  } catch (e) {
    btn.disabled = false;
    btn.textContent = 'Payer sur HelloAsso';
    alert('Erreur lors de la création du paiement : ' + e.message);
  }
}

function validateStep() {
  if (currentStep === 1) {
    const nom = document.getElementById('f-nom').value.trim();
    const prenom = document.getElementById('f-prenom').value.trim();
    const dob = document.getElementById('f-dob').value;
    const tel = document.getElementById('f-tel').value.trim();
    const email = document.getElementById('f-email').value.trim();
    if (!nom || !prenom || !dob || !tel || !email) { alert("Merci de remplir tous les champs obligatoires (marqués d'un *)."); return false; }
    if (!email.includes('@')) { alert('Adresse email invalide.'); return false; }
  }
  if (currentStep === 2) {
    if (!document.getElementById('f-certif').checked) { alert("Vous devez certifier disposer d'un certificat médical pour continuer."); return false; }
  }
  if (currentStep === 3) {
    if (!document.getElementById('f-reglement').checked) { alert('Vous devez accepter le règlement intérieur pour continuer.'); return false; }
  }
  if (currentStep === 4 && currentEvent.price !== 0) {
    if (!document.getElementById('f-paiement-ok').checked) { alert('Merci de cocher la case confirmant que vous avez effectué le paiement sur HelloAsso.'); return false; }
  }
  return true;
}

function nextStep() {
  if (!validateStep()) return;
  if (currentStep === 4) { showSuccess(); return; }
  currentStep++;
  updateStepUI();
  document.querySelector('.modal-body').scrollTop = 0;
}

function prevStep() {
  if (currentStep > 1) { currentStep--; updateStepUI(); }
}

function showSuccess() {
  const nom        = (document.getElementById('f-nom').value || '').trim().toUpperCase();
  const prenom     = document.getElementById('f-prenom').value.trim() || '';
  const email      = document.getElementById('f-email').value.trim() || '';
  const tel        = document.getElementById('f-tel').value.trim() || '-';
  const dob        = document.getElementById('f-dob').value || '-';
  const cat        = document.getElementById('f-categorie').value || 'Non renseigné';
  const niveau     = document.getElementById('f-niveau').value || 'Non renseigné';
  const licence    = document.getElementById('f-licence').value || '-';
  const message    = document.getElementById('f-message').value || '-';
  const isMineur   = document.getElementById('f-mineur').checked;
  const prix       = currentEvent.price === 0 ? 'Gratuit' : '€' + currentEvent.price;
  const now        = new Date().toLocaleString('fr-FR');

  const payload = {
    event_id: currentEvent.id,
    nom, prenom, date_naissance: dob, telephone: tel, email,
    licence_ffk:       licence !== '-' ? licence : null,
    is_mineur:         isMineur,
    categorie:         cat || null,
    niveau:            niveau || null,
    regime:            document.getElementById('f-regime').value || null,
    ceinture_actuelle: currentEvent.isGrade ? (document.getElementById('f-ceinture-actuelle').value || null) : null,
    ceinture_visee:    currentEvent.isGrade ? (document.getElementById('f-ceinture-visee').value || null) : null,
    parent_nom:        isMineur ? (document.getElementById('f-parent-nom').value || null) : null,
    parent_prenom:     isMineur ? (document.getElementById('f-parent-prenom').value || null) : null,
    parent_tel:        isMineur ? (document.getElementById('f-parent-tel').value || null) : null,
    message:           message !== '-' ? message : null,
    certif_medical:    document.getElementById('f-certif').checked,
    droit_image:       document.getElementById('f-image').checked,
    reglement_ok:      document.getElementById('f-reglement').checked
  };

  const emailMsg = 'Un email de confirmation va vous être envoyé à <strong>' + email + '</strong>.';

  document.querySelector('.modal-body').innerHTML =
    '<div class="success-screen">' +
      '<div class="success-icon"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></div>' +
      '<div class="success-title">INSCRIPTION VALIDÉE</div>' +
      '<p class="success-sub">Votre inscription à <strong>' + currentEvent.title + '</strong> a bien été enregistrée. ' + emailMsg + '</p>' +
      '<div class="recap-card">' +
        '<div class="recap-row"><span class="recap-label">Participant</span><span>' + nom + ' ' + prenom + '</span></div>' +
        '<div class="recap-row"><span class="recap-label">Événement</span><span>' + currentEvent.title + '</span></div>' +
        '<div class="recap-row"><span class="recap-label">Montant</span><span style="font-weight:600">' + prix + '</span></div>' +
        '<div class="recap-row"><span class="recap-label">Statut</span><span style="color:#27AE60;font-weight:600">✓ Confirmé</span></div>' +
      '</div>' +
      '<button class="btn-inscr primary" style="width:100%;padding:12px" onclick="closeModal()">Fermer</button>' +
    '</div>';
  document.querySelector('.modal-footer').style.display = 'none';
  document.getElementById('progress-fill').style.width = '100%';

  API.post('/api/registrations', payload)
    .then(r => console.log('Inscription enregistrée, id:', r.id))
    .catch(e => console.warn('Erreur D1:', e));

}

async function sendBrevoNotification(d) {
  if (!CONFIG.BREVO_API_KEY) return;
  try {
    await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'accept': 'application/json', 'api-key': CONFIG.BREVO_API_KEY, 'content-type': 'application/json' },
      body: JSON.stringify({
        sender: { name: CONFIG.CLUB_NAME, email: CONFIG.CLUB_EMAIL },
        to: [{ email: CONFIG.CLUB_EMAIL, name: CONFIG.CLUB_NAME }],
        replyTo: { email: d.email, name: d.prenom + ' ' + d.nom },
        subject: '🥊 Nouvelle inscription — ' + currentEvent.title + ' — ' + d.nom + ' ' + d.prenom,
        htmlContent: '<p>Nouvelle inscription de ' + d.nom + ' ' + d.prenom + ' pour ' + currentEvent.title + '</p>'
      })
    });
  } catch (e) { console.warn('Erreur Brevo club:', e); }
}

async function sendConfirmationToParticipant(d) {
  if (!CONFIG.BREVO_API_KEY || !d.email) return;
  try {
    await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'accept': 'application/json', 'api-key': CONFIG.BREVO_API_KEY, 'content-type': 'application/json' },
      body: JSON.stringify({
        sender: { name: CONFIG.CLUB_NAME, email: CONFIG.CLUB_EMAIL },
        to: [{ email: d.email, name: d.prenom + ' ' + d.nom }],
        subject: '✅ Inscription confirmée — ' + currentEvent.title,
        htmlContent: '<p>Bonjour ' + d.prenom + ', votre inscription à ' + currentEvent.title + ' est confirmée. Montant : ' + d.prix + '</p>'
      })
    });
  } catch (e) { console.warn('Erreur Brevo participant:', e); }
}

document.getElementById('f-mineur').addEventListener('change', function () {
  document.getElementById('mineur-section').style.display = this.checked ? 'block' : 'none';
});

/* ── Admin ── */
let adminEvents = [];
let pendingDeleteId = null;
const typeColors = { stage: '#2980B9', competition: '#C0392B', seminaire: '#2980B9', grade: '#6C3483' };
const typeLabels = { stage: 'Stage', competition: 'Compétition', seminaire: 'Séminaire', grade: 'Passage de grade' };

async function initPage() {
  try {
    const evts = await API.get('/api/events');
    adminEvents = evts.map(normalizeEvent);
    adminEvents.forEach(ev => { events[ev.id] = { title: ev.title, sub: buildSubText(ev), price: ev.price, helloasso: !!ev.helloasso, helloasso_url: ev.helloasso_url || '', isGrade: !!ev.isGrade }; });
    rebuildPublicPage();
  } catch (e) {
    console.error('Impossible de charger les événements:', e);
    document.getElementById('events-grid').innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:3rem;color:#999">Impossible de charger les événements.</div>';
  }
}

function normalizeEvent(ev) {
  return {
    id: ev.id, title: ev.title, sub: ev.sub, type: ev.type, status: ev.status,
    dateStart: ev.date_start, dateEnd: ev.date_end || '', timeStart: ev.time_start || '', timeEnd: ev.time_end || '',
    lieu: ev.lieu, price: ev.price, spots: ev.spots_left, spotsTotal: ev.spots_total,
    featured: !!ev.featured, isGrade: !!ev.is_grade, helloasso: !!ev.helloasso, helloasso_url: ev.helloasso_url || ''
  };
}

document.addEventListener('DOMContentLoaded', initPage);

function openAdminLogin() { document.getElementById('admin-login-overlay').classList.add('open'); setTimeout(() => document.getElementById('admin-pw').focus(), 100); }
function closeAdminLogin() { document.getElementById('admin-login-overlay').classList.remove('open'); document.getElementById('admin-pw').value = ''; document.getElementById('login-error').style.display = 'none'; }

async function checkAdminLogin() {
  const pw = document.getElementById('admin-pw').value.trim();
  if (!pw) return;
  try {
    API._token = pw;
    const r = await fetch(CONFIG.API_URL + '/api/registrations', { headers: { 'Authorization': 'Bearer ' + pw } });
    if (!r.ok) throw new Error('unauthorized');
    closeAdminLogin();
    openAdminPanel();
  } catch (e) {
    API._token = null;
    document.getElementById('login-error').style.display = 'block';
    document.getElementById('admin-pw').value = '';
    document.getElementById('admin-pw').focus();
  }
}

function openAdminPanel() {
  document.getElementById('admin-panel').classList.add('open');
  document.body.style.overflow = 'hidden';
  renderAdminList();
  // Peupler le filtre événements dans l'onglet inscriptions
  const sel = document.getElementById('reg-filter-event');
  sel.innerHTML = '<option value="">Tous les événements</option>' +
    adminEvents.map(ev => '<option value="' + ev.id + '">' + ev.title + '</option>').join('');
}
function quitAdmin() { document.getElementById('admin-panel').classList.remove('open'); document.body.style.overflow = ''; rebuildPublicPage(); }

function fmtDate(d1, d2) {
  if (!d1) return '—';
  const opt = { day: 'numeric', month: 'long', year: 'numeric' };
  const s = new Date(d1).toLocaleDateString('fr-FR', opt);
  if (d2) { return s + ' – ' + new Date(d2).toLocaleDateString('fr-FR', opt); }
  return s;
}

function renderAdminList() {
  const list = document.getElementById('admin-events-list');
  document.getElementById('admin-event-count').textContent = adminEvents.length;
  if (adminEvents.length === 0) {
    list.innerHTML = '<div class="admin-empty"><div class="admin-empty-icon">📭</div><div>Aucun événement</div></div>';
    return;
  }
  list.innerHTML = adminEvents.map(ev => {
    const spotsClass = ev.spots === 0 ? 'spots-full' : ev.spots <= 5 ? 'spots-low' : 'spots-ok';
    const spotsTxt = ev.spots === 0 ? 'Complet' : ev.spots + ' places';
    const priceTxt = ev.price === 0 ? 'Gratuit' : '€' + ev.price;
    const soldOut = ev.status === 'complet';
    return '<div class="admin-event-row' + (soldOut ? ' sold-out' : '') + '">' +
      '<div class="admin-event-color" style="background:' + (typeColors[ev.type] || '#999') + '"></div>' +
      '<div class="admin-event-info"><div class="admin-event-name">' + ev.title + (ev.featured ? ' ⭐' : '') + '</div>' +
      '<div class="admin-event-meta">' + (typeLabels[ev.type] || ev.type) + ' · ' + fmtDate(ev.dateStart, ev.dateEnd) + ' · ' + ev.lieu + '</div></div>' +
      '<div class="admin-event-badges"><span class="admin-spots-badge ' + spotsClass + '">' + spotsTxt + '</span></div>' +
      '<div class="admin-price-tag">' + priceTxt + '</div>' +
      '<div class="admin-actions">' +
      '<button class="admin-btn-edit" data-eid="' + ev.id + '" onclick="openEventForm(this.dataset.eid)">✏ Modifier</button>' +
      '<button class="admin-btn-del" data-eid="' + ev.id + '" onclick="askDelete(this.dataset.eid)">🗑 Supprimer</button>' +
      '</div></div>';
  }).join('');
}

function openEventForm(id) {
  const isNew = !id;
  document.getElementById('admin-modal-title').textContent = isNew ? 'NOUVEL ÉVÉNEMENT' : "MODIFIER L'ÉVÉNEMENT";
  ['ae-title', 'ae-sub', 'ae-date-start', 'ae-date-end', 'ae-time-start', 'ae-time-end', 'ae-lieu', 'ae-price', 'ae-spots', 'ae-helloasso-url'].forEach(f => { document.getElementById(f).value = ''; });
  document.getElementById('ae-id').value = id || '';
  document.getElementById('ae-featured').checked = false;
  document.getElementById('ae-isGrade').checked = false;
  document.getElementById('ae-helloasso').checked = false;
  document.getElementById('ae-ha-url-group').style.display = 'none';
  document.querySelectorAll('#ae-type-group .admin-toggle-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('#ae-status-group .admin-toggle-btn').forEach(b => b.classList.remove('active'));
  document.querySelector('#ae-status-group [data-val="disponible"]').classList.add('active');
  if (!isNew) {
    const ev = adminEvents.find(e => e.id === id);
    if (!ev) return;
    document.getElementById('ae-title').value = ev.title;
    document.getElementById('ae-sub').value = ev.sub;
    document.getElementById('ae-date-start').value = ev.dateStart || '';
    document.getElementById('ae-date-end').value = ev.dateEnd || '';
    document.getElementById('ae-time-start').value = ev.timeStart || '';
    document.getElementById('ae-time-end').value = ev.timeEnd || '';
    document.getElementById('ae-lieu').value = ev.lieu || '';
    document.getElementById('ae-price').value = ev.price;
    document.getElementById('ae-spots').value = ev.spots;
    document.getElementById('ae-featured').checked = !!ev.featured;
    document.getElementById('ae-isGrade').checked = !!ev.isGrade;
    document.getElementById('ae-helloasso').checked = !!ev.helloasso;
    document.getElementById('ae-helloasso-url').value = ev.helloasso_url || '';
    document.getElementById('ae-ha-url-group').style.display = ev.helloasso ? 'block' : 'none';
    const typeBtn = document.querySelector('#ae-type-group [data-val="' + ev.type + '"]');
    if (typeBtn) typeBtn.classList.add('active');
    document.querySelectorAll('#ae-status-group .admin-toggle-btn').forEach(b => b.classList.remove('active'));
    const stBtn = document.querySelector('#ae-status-group [data-val="' + ev.status + '"]');
    if (stBtn) stBtn.classList.add('active');
  }
  document.getElementById('admin-event-modal').classList.add('open');
}

function closeEventForm() { document.getElementById('admin-event-modal').classList.remove('open'); }

function selectToggle(groupId, btn) {
  document.querySelectorAll('#' + groupId + ' .admin-toggle-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

function toggleHAUrl() { document.getElementById('ae-ha-url-group').style.display = document.getElementById('ae-helloasso').checked ? 'block' : 'none'; }

async function saveEvent() {
  const title = document.getElementById('ae-title').value.trim();
  const sub = document.getElementById('ae-sub').value.trim();
  const dateStart = document.getElementById('ae-date-start').value;
  const lieu = document.getElementById('ae-lieu').value.trim();
  const priceVal = document.getElementById('ae-price').value;
  const spotsVal = document.getElementById('ae-spots').value;
  const typeBtn = document.querySelector('#ae-type-group .admin-toggle-btn.active');
  if (!title || !sub || !dateStart || !lieu || priceVal === '' || spotsVal === '') { alert("Veuillez remplir tous les champs obligatoires."); return; }
  if (!typeBtn) { alert("Veuillez sélectionner un type d'événement."); return; }
  const statusBtn = document.querySelector('#ae-status-group .admin-toggle-btn.active');
  const existingId = document.getElementById('ae-id').value;
  const spotsInt = parseInt(spotsVal) || 0;
  const payload = {
    title, sub, type: typeBtn.dataset.val,
    date_start: dateStart, date_end: document.getElementById('ae-date-end').value || null,
    time_start: document.getElementById('ae-time-start').value || null, time_end: document.getElementById('ae-time-end').value || null,
    lieu, price: parseFloat(priceVal) || 0,
    spots_total: spotsInt, spots_left: existingId ? undefined : spotsInt,
    status: statusBtn ? statusBtn.dataset.val : 'disponible',
    featured: document.getElementById('ae-featured').checked, is_grade: document.getElementById('ae-isGrade').checked,
    helloasso: document.getElementById('ae-helloasso').checked, helloasso_url: document.getElementById('ae-helloasso-url').value.trim() || null
  };
  try {
    const saved = existingId ? await API.adminPut('/api/events/' + existingId, payload) : await API.adminPost('/api/events', payload);
    const norm = normalizeEvent(saved);
    const idx = adminEvents.findIndex(e => e.id === norm.id);
    if (idx >= 0) adminEvents[idx] = norm; else adminEvents.push(norm);
    events[norm.id] = { title: norm.title, sub: buildSubText(norm), price: norm.price, helloasso: norm.helloasso, helloasso_url: norm.helloasso_url, isGrade: norm.isGrade };
    closeEventForm();
    renderAdminList();
  } catch (e) { alert('Erreur lors de la sauvegarde : ' + e.message); }
}

function askDelete(id) {
  const ev = adminEvents.find(e => e.id === id);
  if (!ev) return;
  pendingDeleteId = id;
  document.getElementById('confirm-msg').textContent = 'Voulez-vous vraiment supprimer "' + ev.title + '" ? Cette action est irréversible.';
  document.getElementById('confirm-overlay').classList.add('open');
  document.getElementById('confirm-yes-btn').onclick = () => doDelete();
}

async function doDelete() {
  if (!pendingDeleteId) return;
  try {
    await API.adminDelete('/api/events/' + pendingDeleteId);
    adminEvents = adminEvents.filter(e => e.id !== pendingDeleteId);
    delete events[pendingDeleteId];
    pendingDeleteId = null;
    closeConfirm();
    renderAdminList();
    rebuildPublicPage();
  } catch (e) { alert('Erreur lors de la suppression : ' + e.message); closeConfirm(); }
}

function closeConfirm() { document.getElementById('confirm-overlay').classList.remove('open'); }

/* ── Onglets admin ── */
function switchAdminTab(tab) {
  document.getElementById('admin-pane-events').style.display = tab === 'events' ? 'block' : 'none';
  document.getElementById('admin-pane-regs').style.display   = tab === 'regs'   ? 'block' : 'none';
  document.getElementById('tab-events').classList.toggle('active', tab === 'events');
  document.getElementById('tab-regs').classList.toggle('active', tab === 'regs');
  if (tab === 'regs') loadRegistrations();
}

/* ── Inscriptions ── */
let allRegistrations = [];
let pendingDeleteRegId = null;

async function loadRegistrations() {
  const container = document.getElementById('reg-table-container');
  const eventFilter  = document.getElementById('reg-filter-event').value;
  const statusFilter = document.getElementById('reg-filter-status').value;
  container.innerHTML = '<div class="reg-empty">Chargement…</div>';
  try {
    let path = '/api/registrations?';
    if (eventFilter)  path += 'event_id=' + encodeURIComponent(eventFilter) + '&';
    if (statusFilter) path += 'status='   + encodeURIComponent(statusFilter);
    const regs = await API.get(path);
    allRegistrations = regs;
    document.getElementById('reg-count').textContent = regs.length + ' inscription(s)';
    renderRegistrationsTable(regs);
  } catch(e) {
    container.innerHTML = '<div class="reg-empty">Erreur de chargement : ' + e.message + '</div>';
  }
}

function renderRegistrationsTable(regs) {
  const container = document.getElementById('reg-table-container');
  if (regs.length === 0) {
    container.innerHTML = '<div class="reg-empty">📭 Aucune inscription trouvée.</div>';
    return;
  }
  const statusLabel = { gratuit: 'Gratuit', paye: 'Payé', en_attente: 'En attente', annule: 'Annulé' };
  container.innerHTML =
    '<div class="reg-table-wrap"><table class="reg-table">' +
    '<thead><tr>' +
    '<th>Participant</th><th>Événement</th><th>Email</th><th>Tél</th><th>Montant</th><th>Statut</th><th>Date</th><th></th>' +
    '</tr></thead><tbody>' +
    regs.map(r => {
      const date = new Date(r.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
      const prix = r.montant === 0 ? 'Gratuit' : r.montant + ' €';
      const st   = r.paiement_status || 'en_attente';
      return '<tr>' +
        '<td><strong>' + r.nom + ' ' + r.prenom + '</strong>' + (r.is_mineur ? ' <span style="color:#E67E22;font-size:11px">mineur</span>' : '') + '</td>' +
        '<td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + (r.event_title || r.event_id) + '</td>' +
        '<td><a href="mailto:' + r.email + '" style="color:inherit">' + r.email + '</a></td>' +
        '<td style="white-space:nowrap">' + r.telephone + '</td>' +
        '<td style="white-space:nowrap;font-weight:600">' + prix + '</td>' +
        '<td><span class="reg-status ' + st + '">' + (statusLabel[st] || st) + '</span></td>' +
        '<td style="white-space:nowrap;color:var(--muted)">' + date + '</td>' +
        '<td><button class="btn-del-reg" data-rid="' + r.id + '" onclick="askDeleteReg(this.dataset.rid)">🗑 Supprimer</button></td>' +
        '</tr>';
    }).join('') +
    '</tbody></table></div>';
}

function askDeleteReg(id) {
  const reg = allRegistrations.find(r => String(r.id) === String(id));
  if (!reg) return;
  pendingDeleteRegId = id;
  document.getElementById('confirm-msg').textContent =
    'Supprimer l\'inscription de ' + reg.prenom + ' ' + reg.nom + ' pour "' + (reg.event_title || reg.event_id) + '" ? Cette action est irréversible.';
  document.getElementById('confirm-yes-btn').onclick = () => doDeleteReg();
  document.getElementById('confirm-overlay').classList.add('open');
}

async function doDeleteReg() {
  if (!pendingDeleteRegId) return;
  try {
    await API.adminDelete('/api/registrations/' + pendingDeleteRegId);
    allRegistrations = allRegistrations.filter(r => String(r.id) !== String(pendingDeleteRegId));
    pendingDeleteRegId = null;
    closeConfirm();
    renderRegistrationsTable(allRegistrations);
    document.getElementById('reg-count').textContent = allRegistrations.length + ' inscription(s)';
  } catch(e) {
    alert('Erreur lors de la suppression : ' + e.message);
    closeConfirm();
  }
}

function buildSubText(ev) {
  const typeLbl = typeLabels[ev.type] || ev.type;
  const d = fmtDate(ev.dateStart, ev.dateEnd);
  return typeLbl + ' · ' + d + ' · ' + ev.lieu;
}

function rebuildPublicPage() {
  const newEventsObj = {};
  adminEvents.forEach(ev => { newEventsObj[ev.id] = { title: ev.title, sub: buildSubText(ev), price: ev.price, helloasso: ev.helloasso, helloasso_url: ev.helloasso_url, isGrade: ev.isGrade }; });
  Object.assign(events, newEventsObj);
  Object.keys(events).forEach(k => { if (!newEventsObj[k]) delete events[k]; });
  const grid = document.getElementById('events-grid');
  if (adminEvents.length === 0) {
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:3rem;color:#999;font-size:14px">Aucun événement à venir pour le moment.</div>';
    return;
  }
  grid.innerHTML = adminEvents.map(ev => buildCard(ev)).join('');
}

function buildCard(ev) {
  const typeBadge = { stage: '<span class="badge badge-stage">Stage</span>', competition: '<span class="badge badge-compet">Compétition</span>', seminaire: '<span class="badge badge-stage">Séminaire</span>', grade: '<span class="badge badge-grade">Passage de grade</span>' }[ev.type] || '<span class="badge">Événement</span>';
  const sold = ev.status === 'complet';
  const low = !sold && ev.spots > 0 && ev.spots <= 5;
  const spotsTxt = sold ? '0 place disponible' : low ? '⚡ ' + ev.spots + ' places restantes' : ev.spots + ' places';
  const spotsClass = sold ? 'full' : low ? 'low' : '';
  const priceTxt = ev.price === 0 ? '<span class="free">Gratuit</span>' : '<sup>€</sup>' + ev.price;
  const btnClass = sold ? 'disabled' : ev.price === 0 ? 'outline' : 'primary';
  const btnTxt = sold ? 'Complet' : "S'inscrire →";
  const cardOnclick = sold ? '' : 'data-id="' + ev.id + '" onclick="openModal(this.dataset.id)"';
  const stopProp    = sold ? '' : 'data-id="' + ev.id + '" onclick="event.stopPropagation();openModal(this.dataset.id)"';
  const featured = ev.featured ? ' featured' : '';
  const opacity = sold ? ' style="opacity:.6;pointer-events:none;"' : '';
  const d = fmtDate(ev.dateStart, ev.dateEnd);
  const horaires = ev.timeStart && ev.timeEnd ? '<div class="card-meta-row"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' + ev.timeStart + ' – ' + ev.timeEnd + '</div>' : '';
  return '<div class="event-card' + featured + '" data-type="' + ev.type + (ev.price === 0 ? ' gratuit' : '') + '" ' + cardOnclick + opacity + '>' +
    '<div class="card-badge-row">' + typeBadge + '<span class="card-spots ' + spotsClass + '">' + spotsTxt + '</span></div>' +
    '<div class="card-body"><div class="card-title">' + ev.title + '</div><div class="card-subtitle">' + ev.sub + '</div>' +
    '<div class="card-meta"><div class="card-meta-row"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>' + d + '</div>' +
    '<div class="card-meta-row"><svg viewBox="0 0 24 24"><circle cx="12" cy="11" r="3"/><path d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/></svg>' + ev.lieu + '</div>' + horaires + '</div></div>' +
    '<div class="card-footer"><div class="card-price">' + priceTxt + '</div><button class="btn-inscr ' + btnClass + '" ' + stopProp + '>' + btnTxt + '</button></div></div>';
}
</script>
</body>
</html>
`;

// ── Classe d'erreur métier ─────────────────────────────────────
// IMPORTANT : déclarée AVANT export default pour rester au niveau module
class ApiError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

// ── Validation événement ───────────────────────────────────────
function validateEvent(body) {
  const required = ['title', 'sub', 'type', 'date_start', 'lieu'];
  for (const f of required) {
    if (!body[f]) throw new ApiError(`Champ requis manquant : ${f}`);
  }
  const validTypes = ['stage', 'competition', 'seminaire', 'grade'];
  if (!validTypes.includes(body.type)) {
    throw new ApiError(`Type invalide. Valeurs : ${validTypes.join(', ')}`);
  }
}

// ── Validation inscription ─────────────────────────────────────
function validateRegistration(body) {
  const required = ['event_id', 'nom', 'prenom', 'date_naissance', 'telephone', 'email'];
  for (const f of required) {
    if (!body[f]) throw new ApiError(`Champ requis manquant : ${f}`);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
    throw new ApiError('Email invalide');
  }
  if (body.is_mineur && (!body.parent_nom || !body.parent_prenom || !body.parent_tel)) {
    throw new ApiError('Informations du représentant légal requises pour un mineur');
  }
}

// ── HelloAsso OAuth2 ───────────────────────────────────────────
async function getHelloAssoToken(env) {
  const resp = await fetch('https://api.helloasso.com/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'client_credentials',
      client_id:     env.HELLOASSO_CLIENT_ID,
      client_secret: env.HELLOASSO_CLIENT_SECRET,
    })
  });
  if (!resp.ok) throw new ApiError('Erreur authentification HelloAsso', 502);
  const data = await resp.json();
  return data.access_token;
}

// ── HelloAsso — créer une session Checkout ─────────────────────
async function createHelloAssoCheckout(env, { eventTitle, amount, email, prenom, nom, returnUrl, errorUrl }) {
  const token = await getHelloAssoToken(env);
  const resp = await fetch(
    `https://api.helloasso.com/v5/organizations/${env.HELLOASSO_ORG_SLUG}/checkout-intents`,
    {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        totalAmount:      amount * 100,
        initialAmount:    amount * 100,
        itemName:         eventTitle,
        backUrl:          errorUrl,
        errorUrl:         errorUrl,
        returnUrl:        returnUrl,
        containsDonation: false,
        payer: { email, firstName: prenom, lastName: nom }
      })
    }
  );
  if (!resp.ok) {
    const e = await resp.json();
    console.error('HelloAsso checkout error:', e);
    throw new ApiError('Erreur création checkout HelloAsso', 502);
  }
  const data = await resp.json();
  return data.redirectUrl;
}

// ── Brevo — envoi d'email ──────────────────────────────────────
async function sendBrevoEmail(env, { to, toName, subject, html }) {
  if (!env.BREVO_API_KEY) return; // secret non configuré → skip silencieux
  const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept':       'application/json',
      'api-key':      env.BREVO_API_KEY,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender:  { name: 'American Full Fighting Bons-en-Chablais', email: 'fullfightingbons@gmail.com' },
      to:      [{ email: to, name: toName }],
      subject,
      htmlContent: html,
    }),
  });
  if (!resp.ok) {
    const e = await resp.json().catch(() => ({}));
    console.error('Brevo error:', JSON.stringify(e));
  }
}

async function sendConfirmationEmails(env, { reg, ev }) {
  const CLUB_EMAIL = 'fullfightingbons@gmail.com';
  const CLUB_NAME  = 'American Full Fighting Bons-en-Chablais';
  const prix       = ev.price === 0 ? 'Gratuit' : `${ev.price} €`;
  const dateStr    = new Date(ev.date_start).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  // ── Email au participant ───────────────────────────────────
  const participantHtml = `
<!DOCTYPE html><html lang="fr"><body style="font-family:sans-serif;color:#222;max-width:600px;margin:0 auto;padding:20px">
  <div style="background:#050505;padding:20px 24px;border-radius:8px 8px 0 0;text-align:center">
    <span style="font-family:sans-serif;font-size:22px;font-weight:900;letter-spacing:2px;color:#fff">AMERICAN FULL FIGHTING</span><br>
    <span style="color:#aaa;font-size:13px">Bons-en-Chablais · FFK</span>
  </div>
  <div style="border:1px solid #eee;border-top:none;padding:28px 24px;border-radius:0 0 8px 8px">
    <h2 style="color:#E10600;margin-top:0">✅ Inscription confirmée</h2>
    <p>Bonjour <strong>${reg.prenom} ${reg.nom}</strong>,</p>
    <p>Votre inscription à l'événement suivant a bien été enregistrée :</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      <tr style="background:#f9f9f9"><td style="padding:8px 12px;font-weight:600;width:40%">Événement</td><td style="padding:8px 12px">${ev.title}</td></tr>
      <tr><td style="padding:8px 12px;font-weight:600">Date</td><td style="padding:8px 12px">${dateStr}</td></tr>
      <tr style="background:#f9f9f9"><td style="padding:8px 12px;font-weight:600">Lieu</td><td style="padding:8px 12px">${ev.lieu}</td></tr>
      <tr><td style="padding:8px 12px;font-weight:600">Montant</td><td style="padding:8px 12px;font-weight:700;color:#E10600">${prix}</td></tr>
      <tr style="background:#f9f9f9"><td style="padding:8px 12px;font-weight:600">Statut paiement</td><td style="padding:8px 12px">${reg.paiement_status === 'gratuit' ? '✓ Gratuit' : reg.paiement_status === 'paye' ? '✓ Payé' : '⏳ En attente'}</td></tr>
    </table>
    <p style="color:#666;font-size:13px">Pour toute question, répondez à cet email ou contactez-nous à <a href="mailto:${CLUB_EMAIL}">${CLUB_EMAIL}</a>.</p>
    <p style="color:#666;font-size:13px">À bientôt sur le tatami 🥊</p>
    <hr style="border:none;border-top:1px solid #eee;margin:20px 0">
    <p style="color:#aaa;font-size:11px;text-align:center">${CLUB_NAME} · Saison 2025–2026</p>
  </div>
</body></html>`;

  // ── Notification au club ───────────────────────────────────
  const clubHtml = `
<!DOCTYPE html><html lang="fr"><body style="font-family:sans-serif;color:#222;max-width:600px;margin:0 auto;padding:20px">
  <h2 style="color:#E10600">🥊 Nouvelle inscription — ${ev.title}</h2>
  <table style="width:100%;border-collapse:collapse">
    <tr style="background:#f9f9f9"><td style="padding:8px 12px;font-weight:600;width:40%">Participant</td><td style="padding:8px 12px">${reg.prenom} ${reg.nom}</td></tr>
    <tr><td style="padding:8px 12px;font-weight:600">Email</td><td style="padding:8px 12px"><a href="mailto:${reg.email}">${reg.email}</a></td></tr>
    <tr style="background:#f9f9f9"><td style="padding:8px 12px;font-weight:600">Téléphone</td><td style="padding:8px 12px">${reg.telephone}</td></tr>
    <tr><td style="padding:8px 12px;font-weight:600">Date de naissance</td><td style="padding:8px 12px">${reg.date_naissance}</td></tr>
    <tr style="background:#f9f9f9"><td style="padding:8px 12px;font-weight:600">Catégorie</td><td style="padding:8px 12px">${reg.categorie || '—'}</td></tr>
    <tr><td style="padding:8px 12px;font-weight:600">Niveau</td><td style="padding:8px 12px">${reg.niveau || '—'}</td></tr>
    <tr style="background:#f9f9f9"><td style="padding:8px 12px;font-weight:600">Licence FFK</td><td style="padding:8px 12px">${reg.licence_ffk || '—'}</td></tr>
    <tr><td style="padding:8px 12px;font-weight:600">Montant</td><td style="padding:8px 12px;font-weight:700">${prix}</td></tr>
    <tr style="background:#f9f9f9"><td style="padding:8px 12px;font-weight:600">Statut paiement</td><td style="padding:8px 12px">${reg.paiement_status}</td></tr>
    ${reg.message ? `<tr><td style="padding:8px 12px;font-weight:600">Message</td><td style="padding:8px 12px">${reg.message}</td></tr>` : ''}
    ${reg.is_mineur ? `<tr style="background:#fff3cd"><td style="padding:8px 12px;font-weight:600">⚠ Mineur</td><td style="padding:8px 12px">${reg.parent_prenom} ${reg.parent_nom} — ${reg.parent_tel}</td></tr>` : ''}
  </table>
</body></html>`;

  // Envoi en parallèle, sans bloquer la réponse API
  await Promise.allSettled([
    sendBrevoEmail(env, {
      to: reg.email, toName: `${reg.prenom} ${reg.nom}`,
      subject: `✅ Inscription confirmée — ${ev.title}`,
      html: participantHtml,
    }),
    sendBrevoEmail(env, {
      to: CLUB_EMAIL, toName: CLUB_NAME,
      subject: `🥊 Nouvelle inscription — ${ev.title} — ${reg.nom} ${reg.prenom}`,
      html: clubHtml,
    }),
  ]);
}

// ══════════════════════════════════════════════════════════════
//  WORKER PRINCIPAL
//  Toutes les routes sont à l'intérieur du fetch()
// ══════════════════════════════════════════════════════════════
export default {
  async fetch(request, env) {
    const url    = new URL(request.url);
    const path   = url.pathname;
    const method = request.method.toUpperCase();

    // ── Servir index.html ──────────────────────────────────────
    if (method === 'GET' && (path === '/' || path === '')) {
      return new Response(INDEX_HTML, {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300' },
      });
    }

    // ── CORS ───────────────────────────────────────────────────
    const corsHeaders = {
      'Access-Control-Allow-Origin':  '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // ── Helpers internes ───────────────────────────────────────
    const json = (data, status = 200) =>
      new Response(JSON.stringify(data), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    const err = (msg, status = 400) => json({ error: msg }, status);

    const isAdmin = () => {
      const auth  = request.headers.get('Authorization') || '';
      const token = auth.replace('Bearer ', '').trim();
      return token !== '' && token === (env.ADMIN_TOKEN || '');
    };

    const requireAdmin = () => {
      if (!isAdmin()) throw new ApiError('Non autorisé', 401);
    };

    const genId = (prefix = 'evt') => `${prefix}${Date.now().toString(36)}`;

    const segments = path.replace(/^\/api\//, '').split('/');
    const resource = segments[0];
    const resId    = segments[1];
    const subRes   = segments[2];

    try {
      // ══════════════════════════════════════════════════════════
      //  EVENTS
      // ══════════════════════════════════════════════════════════
      if (resource === 'events') {

        // GET /api/events
        if (method === 'GET' && !resId) {
          const { results } = await env.DB.prepare(
            `SELECT * FROM events ORDER BY date_start ASC`
          ).all();
          return json(results);
        }

        // GET /api/events/:id
        if (method === 'GET' && resId) {
          const ev = await env.DB.prepare(
            `SELECT * FROM events WHERE id = ?`
          ).bind(resId).first();
          if (!ev) return err('Événement introuvable', 404);
          const count = await env.DB.prepare(
            `SELECT COUNT(*) as total FROM registrations WHERE event_id = ? AND paiement_status IN ('paye','gratuit')`
          ).bind(resId).first();
          return json({ ...ev, registrations_count: count?.total ?? 0 });
        }

        // POST /api/events [admin]
        if (method === 'POST') {
          requireAdmin();
          const body = await request.json();
          const id   = body.id || genId('evt');
          validateEvent(body);
          await env.DB.prepare(`
            INSERT INTO events
              (id, title, sub, type, status, date_start, date_end, time_start, time_end,
               lieu, price, spots_total, spots_left, featured, is_grade, helloasso, helloasso_url)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
          `).bind(
            id, body.title, body.sub, body.type,
            body.status ?? 'disponible',
            body.date_start, body.date_end ?? null,
            body.time_start ?? null, body.time_end ?? null,
            body.lieu, body.price ?? 0,
            body.spots_total ?? 0, body.spots_left ?? body.spots_total ?? 0,
            body.featured  ? 1 : 0, body.is_grade  ? 1 : 0,
            body.helloasso ? 1 : 0, body.helloasso_url ?? null,
          ).run();
          const created = await env.DB.prepare(`SELECT * FROM events WHERE id = ?`).bind(id).first();
          return json(created, 201);
        }

        // PUT /api/events/:id [admin]
        if (method === 'PUT' && resId) {
          requireAdmin();
          const body = await request.json();
          validateEvent(body);
          await env.DB.prepare(`
            UPDATE events SET
              title = ?, sub = ?, type = ?, status = ?,
              date_start = ?, date_end = ?, time_start = ?, time_end = ?,
              lieu = ?, price = ?, spots_total = ?, spots_left = ?,
              featured = ?, is_grade = ?, helloasso = ?, helloasso_url = ?
            WHERE id = ?
          `).bind(
            body.title, body.sub, body.type, body.status ?? 'disponible',
            body.date_start, body.date_end ?? null,
            body.time_start ?? null, body.time_end ?? null,
            body.lieu, body.price ?? 0,
            body.spots_total ?? 0, body.spots_left ?? body.spots_total ?? 0,
            body.featured  ? 1 : 0, body.is_grade  ? 1 : 0,
            body.helloasso ? 1 : 0, body.helloasso_url ?? null,
            resId,
          ).run();
          const updated = await env.DB.prepare(`SELECT * FROM events WHERE id = ?`).bind(resId).first();
          if (!updated) return err('Événement introuvable', 404);
          return json(updated);
        }

        // DELETE /api/events/:id [admin]
        if (method === 'DELETE' && resId) {
          requireAdmin();
          const info = await env.DB.prepare(`DELETE FROM events WHERE id = ?`).bind(resId).run();
          if (info.changes === 0) return err('Événement introuvable', 404);
          return json({ deleted: resId });
        }
      }

      // ══════════════════════════════════════════════════════════
      //  REGISTRATIONS
      // ══════════════════════════════════════════════════════════
      if (resource === 'registrations') {

        // GET /api/registrations [admin]
        if (method === 'GET' && !resId) {
          requireAdmin();
          const eventFilter  = url.searchParams.get('event_id');
          const statusFilter = url.searchParams.get('status');
          let query  = `SELECT r.*, e.title as event_title FROM registrations r JOIN events e ON e.id = r.event_id WHERE 1=1`;
          const params = [];
          if (eventFilter)  { query += ` AND r.event_id = ?`;          params.push(eventFilter); }
          if (statusFilter) { query += ` AND r.paiement_status = ?`;   params.push(statusFilter); }
          query += ` ORDER BY r.created_at DESC`;
          const stmt = env.DB.prepare(query);
          const { results } = await (params.length ? stmt.bind(...params) : stmt).all();
          return json(results);
        }

        // GET /api/registrations/:id [admin]
        if (method === 'GET' && resId && !subRes) {
          requireAdmin();
          const reg = await env.DB.prepare(
            `SELECT r.*, e.title as event_title, e.price as event_price
             FROM registrations r JOIN events e ON e.id = r.event_id WHERE r.id = ?`
          ).bind(resId).first();
          if (!reg) return err('Inscription introuvable', 404);
          return json(reg);
        }

        // POST /api/registrations [public]
        if (method === 'POST' && !resId) {
          const body = await request.json();
          validateRegistration(body);
          const ev = await env.DB.prepare(`SELECT * FROM events WHERE id = ?`).bind(body.event_id).first();
          if (!ev)                    return err('Événement introuvable', 404);
          if (ev.status === 'complet') return err('Événement complet', 409);
          if (ev.spots_left <= 0)      return err('Plus de places disponibles', 409);
          const paiementStatus = ev.price === 0 ? 'gratuit' : 'en_attente';
          const info = await env.DB.prepare(`
            INSERT INTO registrations (
              event_id, nom, prenom, date_naissance, telephone, email,
              licence_ffk, is_mineur, categorie, niveau, regime,
              ceinture_actuelle, ceinture_visee,
              parent_nom, parent_prenom, parent_tel,
              message, certif_medical, droit_image, reglement_ok,
              montant, paiement_status, helloasso_ref
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
          `).bind(
            body.event_id, body.nom, body.prenom, body.date_naissance,
            body.telephone, body.email,
            body.licence_ffk   ?? null, body.is_mineur ? 1 : 0,
            body.categorie     ?? null, body.niveau ?? null, body.regime ?? null,
            body.ceinture_actuelle ?? null, body.ceinture_visee ?? null,
            body.parent_nom    ?? null, body.parent_prenom ?? null, body.parent_tel ?? null,
            body.message       ?? null,
            body.certif_medical ? 1 : 0, body.droit_image ? 1 : 0, body.reglement_ok ? 1 : 0,
            ev.price, paiementStatus, body.helloasso_ref ?? null,
          ).run();
          const regData = {
            nom: body.nom, prenom: body.prenom, email: body.email,
            telephone: body.telephone, date_naissance: body.date_naissance,
            categorie: body.categorie ?? null, niveau: body.niveau ?? null,
            licence_ffk: body.licence_ffk ?? null, message: body.message ?? null,
            is_mineur: body.is_mineur ? 1 : 0,
            parent_nom: body.parent_nom ?? null, parent_prenom: body.parent_prenom ?? null, parent_tel: body.parent_tel ?? null,
            paiement_status: paiementStatus,
          };
          // Envoi emails en arrière-plan (ne bloque pas la réponse)
          env.BREVO_API_KEY && sendConfirmationEmails(env, { reg: regData, ev }).catch(e => console.error('Email error:', e));
          return json({ id: info.meta.last_row_id, event_id: body.event_id, paiement_status: paiementStatus, montant: ev.price }, 201);
        }

        // PUT /api/registrations/:id/status [admin]
        if (method === 'PUT' && resId && subRes === 'status') {
          requireAdmin();
          const body = await request.json();
          const validStatuses = ['en_attente', 'paye', 'gratuit', 'annule'];
          if (!validStatuses.includes(body.paiement_status)) {
            return err(`Statut invalide. Valeurs : ${validStatuses.join(', ')}`);
          }
          const info = await env.DB.prepare(`
            UPDATE registrations SET paiement_status = ?, helloasso_ref = COALESCE(?, helloasso_ref) WHERE id = ?
          `).bind(body.paiement_status, body.helloasso_ref ?? null, resId).run();
          if (info.changes === 0) return err('Inscription introuvable', 404);
          return json({ id: resId, paiement_status: body.paiement_status });
        }

        // DELETE /api/registrations/:id [admin]
        if (method === 'DELETE' && resId) {
          requireAdmin();
          const info = await env.DB.prepare(`DELETE FROM registrations WHERE id = ?`).bind(resId).run();
          if (info.changes === 0) return err('Inscription introuvable', 404);
          return json({ deleted: Number(resId) });
        }
      }

      // ══════════════════════════════════════════════════════════
      //  CHECKOUT HELLOASSO
      // ══════════════════════════════════════════════════════════
      if (resource === 'checkout' && method === 'POST') {
        const body = await request.json();
        const { event_id, nom, prenom, email } = body;
        if (!event_id || !nom || !prenom || !email) {
          return err('Champs requis : event_id, nom, prenom, email');
        }
        const ev = await env.DB.prepare('SELECT * FROM events WHERE id = ?').bind(event_id).first();
        if (!ev)                     return err('Evenement introuvable', 404);
        if (ev.price === 0)          return err('Evenement gratuit, pas de checkout', 400);
        if (ev.status === 'complet') return err('Evenement complet', 409);

        const origin    = url.origin;
        const returnUrl = `${origin}/?checkout=success&event_id=${event_id}`;
        const errorUrl  = `${origin}/?checkout=error&event_id=${event_id}`;

        const redirectUrl = await createHelloAssoCheckout(env, {
          eventTitle: ev.title,
          amount:     ev.price,
          email, prenom, nom,
          returnUrl, errorUrl,
        });
        return json({ redirectUrl });
      }
      // ── Route introuvable ─────────────────────────────────────
      return err('Route introuvable', 404);

    } catch (e) {
      if (e instanceof ApiError) return err(e.message, e.status);
      console.error(e);
      return err('Erreur serveur interne', 500);
    }
  },
};
