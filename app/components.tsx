"use client";

import Link from "next/link";
import {usePathname,useRouter} from "next/navigation";
import {clearSession,apiMe,apiFetch,useRealtimeStream} from "./lib";
import {useEffect,useState} from "react";

export function Logo(){
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");

  return (
    <Link
      href={isAdmin ? "/admin" : "/dashboard"}
      className="brand"
    >
      <img
        src="/nexdrop-logo.svg"
        alt="Nexdrop"
        className="sidebar-logo"
      />
    </Link>
  );
}

function useUnreadCount(){
  const [count, setCount] = useState(0);

  const load = async () => {
    try {
      const r = await apiFetch("/api/support", { cache: "no-store" });
      if (r.ok) {
        const d = await r.json();
        setCount(Number(d.unreadCount || 0));
      }
    } catch {}
  };

  useEffect(() => {
    load();
  }, []);

  useRealtimeStream(() => {
    load();
  });

  return count;
}

function useUnseenOrders(){
  const [count, setCount] = useState(0);

  const load = async () => {
    try {
      const r = await apiFetch("/api/orders/mark-seen", { cache: "no-store" });
      if (r.ok) {
        const d = await r.json();
        setCount(Number(d.unseenCount || 0));
      }
    } catch {}
  };

  useEffect(() => { load(); }, []);

  useRealtimeStream(() => { load(); });

  return { count, reload: load };
}


export function ProfileAvatar({image,name,className="",style}:{image?:string;name?:string;className?:string;style?:React.CSSProperties}){
  return (
    <div className={`profile-avatar ${image ? "has-photo" : ""} ${className}`} style={style}>
      {image ? <img src={image} alt={name || "Profile photo"}/> : (name?.[0] || "N")}
    </div>
  );
}

function SidebarProfile({name,role,image}:{name:string;role:string;image?:string}){
  return (
    <div className="sidebar-profile">
      <ProfileAvatar image={image} name={name}/>
      <div>
        <b>{name}</b>
        <small>{role}</small>
      </div>
    </div>
  );
}


/* Sidebar icon set (stroke icons, drawn on a 3D tile via .nav-icon CSS) */
const NAV_PATHS:Record<string,React.ReactNode>={
  dashboard:<><rect x="3" y="3" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="2"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2"/></>,
  profile:<><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></>,
  store:<><path d="M3 9l1.5-5h15L21 9"/><path d="M3 9h18v2a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0z"/><path d="M5 13v8h14v-8"/><path d="M10 21v-5h4v5"/></>,
  crown:<><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z"/><path d="M5 19h14"/></>,
  box:<><path d="M21 8l-9-5-9 5 9 5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></>,
  truck:<><path d="M2 6h11v10H2z"/><path d="M13 9h4l4 4v3h-8"/><circle cx="6.5" cy="17.5" r="2"/><circle cx="17" cy="17.5" r="2"/></>,
  wallet:<><path d="M3 7a2 2 0 0 1 2-2h13v4"/><rect x="3" y="7" width="18" height="13" rx="2.5"/><path d="M16 13.5h2"/></>,
  headset:<><path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="13" width="4" height="6" rx="1.5"/><rect x="17" y="13" width="4" height="6" rx="1.5"/><path d="M19 19a3 3 0 0 1-3 3h-3"/></>,
  logout:<><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M10 16l-4-4 4-4"/><path d="M6 12h10"/></>,
  chart:<><path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M22 20H2"/></>,
  users:<><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c1-3.5 3.5-5 6.5-5s5.5 1.5 6.5 5"/><circle cx="17" cy="9" r="2.5"/><path d="M16.5 14c2.5 0 4.2 1.2 5 4"/></>,
  shield:<><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/></>,
  tag:<><path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.5"/></>,
  inbox:<><path d="M3 13l3-8h12l3 8"/><path d="M3 13v6h18v-6h-5l-1.5 3h-5L8 13z"/></>,
  eye:<><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></>,
  mail:<><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M3.5 7l8.5 6 8.5-6"/></>
};

function NavGlyph({name}:{name:string}){
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {NAV_PATHS[name]}
    </svg>
  );
}

function Nav({
  href,
  active,
  children,
  onClick
}:{
  href:string;
  active:boolean;
  children:React.ReactNode;
  onClick?:()=>void;
}){
  return (
    <Link
      href={href}
      className={`side-link ${active?"active":""}`}
      onClick={onClick}
    >
      {children}
    </Link>
  );
}

export function UserShell({children}:{children:React.ReactNode}){
  const pathname=usePathname();
  const router=useRouter();

  const[name,setName]=useState("User");
  const[profileImage,setProfileImage]=useState("");
  const [sellerRating,setSellerRating]=useState(0);
  const[loading,setLoading]=useState(true);

  const [sidebarOpen,setSidebarOpen] = useState(false);
  const [isMobile,setIsMobile] = useState(false);

  const unread=useUnreadCount();
  const { count: unseenOrders, reload: reloadOrders } = useUnseenOrders();

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 900;
      setIsMobile(mobile);
      if (!mobile) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [pathname, isMobile]);

  useEffect(()=>{
    apiMe()
      .then(d=>{
        if(d.user.role!=="customer") throw new Error();
        setName(d.user.name);
        setProfileImage(d.user.profileImage || "");
        setSellerRating(Number(d.user.sellerRating || 0));
      })
      .catch(()=>{
        clearSession();
        router.replace("/login");
      })
      .finally(()=>setLoading(false));
  },[router]);

  useRealtimeStream(d => {
    if (d?.user) {
      setName(d.user.name);
      setProfileImage(d.user.profileImage || "");
      setSellerRating(Number(d.user.sellerRating || 0));
    }
  });

  const logout=async()=>{
    await apiFetch("/api/auth/logout",{ method:"POST" });
    clearSession();
    router.push("/");
  };

  const closeDrawer = () => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  if(loading) {
    return (
      <div className="loading-screen">
        Loading Nexdrop…
      </div>
    );
  }

  return (
    <div className={`app-shell ${sidebarOpen ? "sidebar-open" : "sidebar-collapsed"}`}>
      {/* Mobile Drawer Backdrop Overlay */}
      {sidebarOpen && isMobile && (
        <div
          className="sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close menu"
        />
      )}

      <aside className="sidebar">
        <div className="side-brand">
          <Logo/>
          {/* Close/collapse button — shown on both mobile & desktop */}
          <button
            className="sidebar-close-btn"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

        <div className="side-label">
          CUSTOMER AREA
        </div>

        <Nav href="/dashboard" active={pathname==="/dashboard"} onClick={closeDrawer}>
          <span className="nav-icon" data-c="teal"><NavGlyph name="dashboard"/></span>
          <span className="nav-label">Dashboard</span>
        </Nav>

        <Nav href="/profile" active={pathname==="/profile"} onClick={closeDrawer}>
          <span className="nav-icon" data-c="sky"><NavGlyph name="profile"/></span>
          <span className="nav-label">Profile</span>
        </Nav>

        <Nav href="/my-store" active={pathname==="/my-store"} onClick={closeDrawer}>
          <span className="nav-icon" data-c="emerald"><NavGlyph name="store"/></span>
          <span className="nav-label">My Store</span>
        </Nav>

        <Nav href="/traffic-packages" active={pathname==="/traffic-packages"} onClick={closeDrawer}>
          <span className="nav-icon" data-c="amber"><NavGlyph name="crown"/></span>
          <span className="nav-label">Packages</span>
        </Nav>

        <Nav href="/orders" active={pathname==="/orders"} onClick={async () => {
            closeDrawer();
            if (unseenOrders > 0) {
              await apiFetch("/api/orders/mark-seen", { method: "POST" });
              reloadOrders();
            }
          }}>
          <span className="nav-icon" data-c="orange"><NavGlyph name="box"/></span>
          <span className="nav-label" style={{ display:"flex", alignItems:"center", justifyContent:"space-between", width:"100%" }}>
            Orders
            {unseenOrders > 0 && (
              <span style={{
                width:"9px", height:"9px", borderRadius:"50%",
                background:"#ef4444",
                boxShadow:"0 0 6px rgba(239,68,68,0.7)",
                display:"inline-block", flexShrink:0
              }} />
            )}
          </span>
        </Nav>

        <Nav href="/order-status" active={pathname==="/order-status"} onClick={closeDrawer}>
          <span className="nav-icon" data-c="indigo"><NavGlyph name="truck"/></span>
          <span className="nav-label">Tracking</span>
        </Nav>

        <Nav href="/withdrawal" active={pathname==="/withdrawal"} onClick={closeDrawer}>
          <span className="nav-icon" data-c="violet"><NavGlyph name="wallet"/></span>
          <span className="nav-label">Withdrawal</span>
        </Nav>

        <Nav href="/support" active={pathname==="/support"} onClick={closeDrawer}>
          <span className="nav-icon" data-c="rose"><NavGlyph name="headset"/></span>
          <span className="nav-label">Support</span>
          {unread > 0 && (
            <b className="count">
              {unread > 99 ? "99+" : unread}
            </b>
          )}
        </Nav>

        <div className="side-bottom">
          <SidebarProfile
            name={name}
            role="Customer Account"
            image={profileImage}
          />
          <button className="side-link" onClick={logout}>
            <span className="nav-icon" data-c="red"><NavGlyph name="logout"/></span>
            <span className="nav-label">Logout</span>
          </button>
        </div>
      </aside>

      {/* Modern Mobile Header Bar (Screen <= 900px) */}
      <header className="mobile-header-bar">
        <button
          className="mobile-menu-trigger"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle navigation"
        >
          ☰
        </button>

        <div className="mobile-header-brand">
          <Logo />
        </div>

        <div className="mobile-header-right">
          <span className="admin-chip live-chip mobile-live-chip">
            <i/> Live
          </span>
          <ProfileAvatar
            image={profileImage}
            name={name || "U"}
            className="mobile-avatar"
            style={{ width: 32, height: 32, margin: 0, fontSize: 13 }}
          />
        </div>
      </header>

      {/* Desktop Collapse/Expand Trigger */}
      <button
        className="sidebar-toggle desktop-toggle"
        onClick={()=>setSidebarOpen(!sidebarOpen)}
        aria-label="Toggle sidebar"
      >
        ☰
      </button>

      <main className="app-main user-themed">
        <div className="topbar desktop-topbar">
          <div className="brand-welcome">
            <div className="brand-row">
              <a
                href="https://www.global.ubuy.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="dashboard-logo"
              >
                <img
                  src="/ubuy-link.png"
                  alt="Nexdrop"
                />
              </a>

              <div className="seller-rating">
                <span>Rating</span>
                <strong className="rating-stars">
                  {Array.from({length:5}).map((_,i)=>{
                    const fill=Math.min(Math.max(sellerRating-i,0),1)*100;
                    return(
                      <span
                        key={i}
                        style={{
                          background:`linear-gradient(90deg,#ffd43b ${fill}%,#39465a ${fill}%)`,
                          WebkitBackgroundClip:"text",
                          color:"transparent"
                        }}
                      >
                        ★
                      </span>
                    );
                  })}
                </strong>
                <b>{sellerRating.toFixed(1)}</b>
              </div>
            </div>

            <h1>Welcome, {name.split(" ")[0]}</h1>
          </div>

          <div className="top-actions">
            <span className="admin-chip live-chip">
              <i/> Live Account
            </span>
            <ProfileAvatar
              image={profileImage}
              name={name}
              style={{ width:42, height:42, margin:0, fontSize:15 }}
            />
          </div>
        </div>

        {children}
      </main>
    </div>
  );
}

export function AdminShell({children}:{children:React.ReactNode}){
  const pathname=usePathname();
  const router=useRouter();

  const[loading,setLoading]=useState(true);
  const [sidebarOpen,setSidebarOpen] = useState(false);
  const [isMobile,setIsMobile] = useState(false);

  const unread=useUnreadCount();

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 900;
      setIsMobile(mobile);
      if (!mobile) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [pathname, isMobile]);

  useEffect(()=>{
    const session = sessionStorage.getItem("dz_tab_session");
    if(!session){
      clearSession();
      router.replace("/login");
      return;
    }

    apiMe()
      .then(d=>{
        if(d.user.role!=="admin"){
          throw new Error("Not admin");
        }
      })
      .catch((err)=>{
        console.log("Admin auth error:",err);
      })
      .finally(()=>{
        setLoading(false);
      });
  },[router]);

  const logout=async()=>{
    await apiFetch("/api/auth/logout",{ method:"POST" });
    clearSession();
    router.push("/");
  };

  const closeDrawer = () => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  if(loading) {
    return (
      <div className="loading-screen">
        Loading Admin Control Center…
      </div>
    );
  }

  return (
    <div className={`app-shell ${sidebarOpen ? "sidebar-open" : "sidebar-collapsed"}`}>
      {/* Mobile Drawer Backdrop Overlay */}
      {sidebarOpen && isMobile && (
        <div
          className="sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close menu"
        />
      )}

      <aside className="sidebar">
        <div className="side-brand">
          <Logo/>
          {/* Close/collapse button — shown on both mobile & desktop */}
          <button
            className="sidebar-close-btn"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

        <div className="admin-badge">
          ⚡ ADMIN CONTROL CENTER
        </div>

        <div className="side-label">
          MANAGEMENT
        </div>

        <Nav href="/admin" active={pathname==="/admin"} onClick={closeDrawer}>
          <span className="nav-icon" data-c="teal"><NavGlyph name="chart"/></span>
          <span className="nav-label">Overview</span>
        </Nav>

        <Nav href="/admin/users" active={pathname.startsWith("/admin/users")} onClick={closeDrawer}>
          <span className="nav-icon" data-c="sky"><NavGlyph name="users"/></span>
          <span className="nav-label">Users</span>
        </Nav>

        <Nav href="/admin/kyc" active={pathname.startsWith("/admin/kyc")} onClick={closeDrawer}>
          <span className="nav-icon" data-c="emerald"><NavGlyph name="shield"/></span>
          <span className="nav-label">KYC Verification</span>
        </Nav>

        <Nav href="/admin/orders" active={pathname.startsWith("/admin/orders")} onClick={closeDrawer}>
          <span className="nav-icon" data-c="orange"><NavGlyph name="box"/></span>
          <span className="nav-label">Orders</span>
        </Nav>

        <Nav href="/admin/products" active={pathname.startsWith("/admin/products")} onClick={closeDrawer}>
          <span className="nav-icon" data-c="amber"><NavGlyph name="tag"/></span>
          <span className="nav-label">Products</span>
        </Nav>

        <Nav href="/admin/package-requests" active={pathname.startsWith("/admin/package-requests")} onClick={closeDrawer}>
          <span className="nav-icon" data-c="violet"><NavGlyph name="inbox"/></span>
          <span className="nav-label">Package Requests</span>
        </Nav>

        <Nav href="/admin/store-views" active={pathname.startsWith("/admin/store-views")} onClick={closeDrawer}>
          <span className="nav-icon" data-c="indigo"><NavGlyph name="eye"/></span>
          <span className="nav-label">Store Views</span>
        </Nav>

        <Nav href="/admin/invites" active={pathname.startsWith("/admin/invites")} onClick={closeDrawer}>
          <span className="nav-icon" data-c="pink"><NavGlyph name="mail"/></span>
          <span className="nav-label">Customer Invitations</span>
        </Nav>

        <Nav href="/admin/withdrawals" active={pathname.startsWith("/admin/withdrawals")} onClick={closeDrawer}>
          <span className="nav-icon" data-c="lime"><NavGlyph name="wallet"/></span>
          <span className="nav-label">Withdrawal Requests</span>
        </Nav>

        <Nav href="/support?admin=1" active={pathname==="/support"} onClick={closeDrawer}>
          <span className="nav-icon" data-c="rose"><NavGlyph name="headset"/></span>
          <span className="nav-label">Support</span>
          {unread>0 && (
            <b className="count">
              {unread>99?"99+":unread}
            </b>
          )}
        </Nav>

        <div className="side-bottom">
          <div className="sidebar-profile">
            <div className="profile-avatar">
              A
            </div>
            <div>
              <b>Administrator</b>
              <small>Super Admin</small>
            </div>
          </div>

          <button className="side-link" onClick={logout}>
            <span className="nav-icon" data-c="red"><NavGlyph name="logout"/></span>
            <span className="nav-label">Logout</span>
          </button>
        </div>
      </aside>

      {/* Modern Mobile Header Bar for Admin */}
      <header className="mobile-header-bar">
        <button
          className="mobile-menu-trigger"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle navigation"
        >
          ☰
        </button>

        <div className="mobile-header-brand">
          <Logo />
        </div>

        <div className="mobile-header-right">
          <span className="admin-badge" style={{ padding: "4px 8px", fontSize: "10px", margin: 0 }}>
            Admin
          </span>
        </div>
      </header>

      {/* Desktop Collapse/Expand Trigger */}
      <button
        className="sidebar-toggle desktop-toggle"
        onClick={()=>setSidebarOpen(!sidebarOpen)}
        aria-label="Toggle sidebar"
      >
        ☰
      </button>

      <main className="app-main admin-themed">
        {children}
      </main>
    </div>
  );
}