import { createContext, useContext, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import {
  Activity, ArrowLeft, ArrowRight, BookOpen, CalendarDays, Check, CheckCircle2,
  ChevronRight, ClipboardCheck, Eye, FileKey2, Fingerprint,
  HeartHandshake, Home, Info, Leaf, LockKeyhole, LogOut, MessageCircle,
  MoreHorizontal, Network, Phone, Plus, RefreshCw, Search, Settings2, ShieldCheck,
  Sparkles, Sprout, SunMedium, TrendingUp, UserRound, UsersRound, Wind, type LucideIcon
} from 'lucide-react';
import { Link, Redirect, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';

const queryClient = new QueryClient();

type Mode = 'student' | 'admin';
type Checkin = { id: string; date: string; mood: string; energy: string; stress: string; sleep: string; safety: string };
type CommunityPost = { id: string; circle: string; author: string; avatar: string; title: string; body: string; replies: number; likes: number; created: string; liked?: boolean };
type CaseItem = { id: string; anon: string; need: string; priority: 'Review soon' | 'Today' | 'Routine'; status: 'New' | 'In progress' | 'Connected'; created: string };
type DemoState = {
  mode: Mode;
  adminAuthenticated: boolean;
  checkins: Checkin[];
  savedActivities: string[];
  registeredEvent: boolean;
  joinedCircles: string[];
  communityPosts: CommunityPost[];
  peerRequested: boolean;
  consent: { trendStorage: boolean; tailoredSupport: boolean; contactPermission: boolean };
  cases: CaseItem[];
  integrityCheckedAt: string | null;
};

const initialState: DemoState = {
  mode: 'student',
  adminAuthenticated: false,
  checkins: [
    { id: 'sample-1', date: 'Mon', mood: 'Steady', energy: 'Some energy', stress: 'Manageable', sleep: 'Restful', safety: 'No' },
    { id: 'sample-2', date: 'Wed', mood: 'A little low', energy: 'A little low', stress: 'A lot', sleep: 'Uneven', safety: 'No' },
    { id: 'sample-3', date: 'Fri', mood: 'Okay', energy: 'Some energy', stress: 'Some', sleep: 'Uneven', safety: 'No' },
  ],
  savedActivities: ['walk'],
  registeredEvent: false,
  joinedCircles: ['late-night-study', 'music-makers'],
  communityPosts: [
    { id: 'post-1', circle: 'Late Night Study', author: 'quietcomet', avatar: 'QC', title: 'What helps you start when the reading feels impossible?', body: 'I have been staring at the same page for an hour. Looking for tiny rituals that make starting feel less heavy.', replies: 18, likes: 42, created: '24 min ago' },
    { id: 'post-2', circle: 'Music Makers', author: 'orbitingkeys', avatar: 'OK', title: 'Anyone up for a low-pressure jam this weekend?', body: 'No experience required. Just bring a song, a sketch, or curiosity. Thinking Saturday afternoon near the arts building.', replies: 9, likes: 27, created: '1 hr ago' },
    { id: 'post-3', circle: 'First Year Corner', author: 'mossywindow', avatar: 'MW', title: 'A small list of places that feel calm between classes', body: 'The library terrace before noon, the north garden bench, and the second floor of the student union.', replies: 31, likes: 63, created: 'Yesterday' },
  ],
  peerRequested: false,
  consent: { trendStorage: true, tailoredSupport: true, contactPermission: false },
  cases: [
    { id: 'MCI-1042', anon: 'Student 7A2', need: 'Peer connection', priority: 'Today', status: 'New', created: '12 min ago' },
    { id: 'MCI-1038', anon: 'Student 2F9', need: 'Academic pressure', priority: 'Review soon', status: 'In progress', created: '2 hr ago' },
    { id: 'MCI-1031', anon: 'Student 9C4', need: 'Finding community', priority: 'Routine', status: 'Connected', created: 'Yesterday' },
    { id: 'MCI-1029', anon: 'Student 4D6', need: 'Rest and energy', priority: 'Routine', status: 'New', created: 'Yesterday' },
  ],
  integrityCheckedAt: null,
};

type AppContextValue = {
  state: DemoState;
  updateState: (updates: Partial<DemoState>) => void;
  notify: (message: string) => void;
};
const AppContext = createContext<AppContextValue | null>(null);

function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error('App context is unavailable');
  return value;
}

function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState>(initialState);
  const [ready, setReady] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('mci-demo-state-v1');
    if (stored) {
      try { setState({ ...initialState, ...JSON.parse(stored), adminAuthenticated: false }); } catch { setState(initialState); }
    }
    fetch('/api/auth/me', { credentials: 'include' })
      .then((response) => { if (response.ok) setState((current) => ({ ...current, adminAuthenticated: true, mode: 'admin' })); })
      .catch(() => undefined)
      .finally(() => { setAuthChecked(true); setTimeout(() => setReady(true), 280); });
  }, []);

  useEffect(() => {
    if (ready) localStorage.setItem('mci-demo-state-v1', JSON.stringify({ ...state, adminAuthenticated: false }));
  }, [state, ready]);

  useEffect(() => {
    if (!notice) return;
    const timeout = setTimeout(() => setNotice(''), 2800);
    return () => clearTimeout(timeout);
  }, [notice]);

  const updateState = (updates: Partial<DemoState>) => setState((current) => ({ ...current, ...updates }));
  if (!ready || !authChecked) return <LoadingScreen />;
  return (
    <AppContext.Provider value={{ state, updateState, notify: setNotice }}>
      {children}
      {notice && <div className="toast-note" role="status" data-testid="status-toast">{notice}</div>}
    </AppContext.Provider>
  );
}

function LoadingScreen() {
  return (
    <div className="app-frame" style={{ display: 'grid', placeItems: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <LogoMark />
        <p className="eyebrow" style={{ marginTop: '1rem' }}>Preparing your private space</p>
        <div className="progress-track" style={{ width: 180, margin: '1rem auto' }}><span className="loading-dash" style={{ width: '62%' }} /></div>
      </div>
    </div>
  );
}

function LogoMark({ compact = false }: { compact?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '.62rem' }}>
      <div style={{ width: compact ? 30 : 36, height: compact ? 30 : 36, display: 'grid', placeItems: 'center', borderRadius: '.75rem', background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}>
        <Sprout size={compact ? 17 : 20} strokeWidth={1.8} />
      </div>
      <div>
        <div className="display" style={{ fontSize: compact ? '1rem' : '1.15rem', lineHeight: 1 }}>MCI</div>
        {!compact && <div className="eyebrow" style={{ fontSize: '.54rem', marginTop: '.22rem' }}>Mindful Campus Initiative</div>}
      </div>
    </div>
  );
}

function AdminLogin() {
  const { state, updateState, notify } = useApp();
  const [, navigate] = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (state.adminAuthenticated) navigate('/admin');
  }, [state.adminAuthenticated, navigate]);

  const signIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim() || password.length < 8) {
      setError('Enter your staff email and an 8-character password.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const response = await fetch('/api/auth/login', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) { setError(result.message ?? 'Unable to sign in right now.'); return; }
      updateState({ adminAuthenticated: true, mode: 'admin' });
      notify('Staff workspace unlocked');
      navigate('/admin');
    } catch {
      setError('The staff service is unavailable. Start the API server and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return <div className="admin-login-page"><div className="admin-login-panel animate-rise"><Link href="/" className="admin-login-brand" data-testid="link-login-home"><LogoMark /></Link><div className="eyebrow" style={{ marginTop: '2.6rem' }}>Staff access</div><h1 className="display" style={{ fontSize: '2.6rem', lineHeight: 1.02, margin: '.45rem 0 .65rem' }}>Care operations,<br />kept private.</h1><p className="muted" style={{ fontSize: '.82rem', lineHeight: 1.6, maxWidth: 390 }}>Sign in to manage support requests, campus programs, and privacy controls. This space is separate from the student experience.</p><form onSubmit={signIn} style={{ display: 'grid', gap: '.85rem', marginTop: '1.6rem' }}><label className="field-label" htmlFor="admin-email">Staff email<input id="admin-email" className="input-field" type="email" autoComplete="username" placeholder="you@university.edu" value={email} onChange={(event) => setEmail(event.target.value)} data-testid="input-admin-email" /></label><label className="field-label" htmlFor="admin-password">Password<input id="admin-password" className="input-field" type="password" autoComplete="current-password" placeholder="At least 8 characters" value={password} onChange={(event) => setPassword(event.target.value)} data-testid="input-admin-password" /></label>{error && <div className="form-error" role="alert">{error}</div>}<button className="primary-button" type="submit" disabled={submitting} style={{ marginTop: '.35rem', minHeight: '3rem' }} data-testid="button-admin-sign-in">{submitting ? 'Checking access…' : <>Open staff workspace <ArrowRight size={15} /></>}</button></form><div className="admin-login-note"><LockKeyhole size={15} /><span>Authentication is handled by the MCI server session.</span></div></div><div className="admin-login-aside"><div className="eyebrow">Mindful Campus Initiative</div><h2 className="display">Good operations make<br />care easier to reach.</h2><div className="login-aside-list"><div><ShieldCheck size={18} /><span>Anonymized by default</span></div><div><MessageCircle size={18} /><span>Human-led support queues</span></div><div><Network size={18} /><span>Auditable program changes</span></div></div></div></div>;
}

function StudentTopbar() {
  return (
    <header className="topbar" style={{ padding: '.85rem 1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '.7rem' }}>
        <Link href="/" data-testid="link-logo-home" style={{ color: 'inherit', textDecoration: 'none' }}><LogoMark compact /></Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.45rem' }}>
          <Link href="/profile" className="icon-button" aria-label="Open profile and privacy" data-testid="link-profile"><UserRound size={16} /></Link>
        </div>
      </div>
    </header>
  );
}

const studentNav = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/check-in', label: 'Check-in', icon: ClipboardCheck },
  { href: '/wellness', label: 'Wellness', icon: Leaf },
  { href: '/community', label: 'Community', icon: UsersRound },
  { href: '/support', label: 'Support', icon: HeartHandshake },
  { href: '/profile', label: 'Profile', icon: UserRound },
];

function StudentBottomNav() {
  const [location] = useLocation();
  return (
    <nav className="bottom-nav" aria-label="Student navigation">
      {studentNav.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href} className={location === href ? 'active' : ''} data-testid={`link-nav-${label.toLowerCase()}`}>
          <Icon />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}

function StudentShell({ children }: { children: ReactNode }) {
  return <div className="student-shell"><StudentTopbar /><main className="student-content">{children}</main><StudentBottomNav /></div>;
}

function AdminRail() {
  const [location] = useLocation();
  const links = [
    { href: '/admin', label: 'Overview', icon: Activity },
    { href: '/admin/cases', label: 'Support queue', icon: MessageCircle },
    { href: '/admin/programs', label: 'Programs & resources', icon: BookOpen },
    { href: '/admin/security', label: 'Security & audit', icon: ShieldCheck },
  ];
  return (
    <aside className="side-rail">
      <Link href="/admin" data-testid="link-admin-logo" style={{ textDecoration: 'none', color: 'inherit', margin: '0 0 2rem .4rem' }}><LogoMark /></Link>
      <div className="eyebrow" style={{ padding: '0 .85rem', marginBottom: '.55rem' }}>Workspace</div>
      {links.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={location === href ? 'active' : ''} data-testid={`link-admin-${label.toLowerCase().replaceAll(' ', '-')}`}><Icon size={17} /><span>{label}</span>{location === href && <ChevronRight size={14} style={{ marginLeft: 'auto' }} />}</Link>)}
      <div style={{ marginTop: 'auto', padding: '.9rem .85rem', borderRadius: '.9rem', background: 'hsl(var(--secondary) / .65)' }}>
        <LockKeyhole size={16} style={{ color: 'hsl(var(--primary))', marginBottom: '.5rem' }} />
        <div style={{ fontSize: '.75rem', fontWeight: 700 }}>Protected workspace</div>
        <p className="muted" style={{ fontSize: '.68rem', lineHeight: 1.5, margin: '.3rem 0 0' }}>Anonymized signals only. No individual diagnosis or surveillance.</p>
      </div>
    </aside>
  );
}

function AdminShell({ children }: { children: ReactNode }) {
  const { state, updateState, notify } = useApp();
  const [, navigate] = useLocation();
  if (!state.adminAuthenticated) return <Redirect to="/admin/login" />;
  const signOut = async () => { await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }); updateState({ adminAuthenticated: false, mode: 'student' }); notify('Staff workspace locked'); navigate('/'); };
  return (
    <div className="app-shell">
      <AdminRail />
      <div className="admin-main">
        <header className="admin-header">
          <div>
            <div className="eyebrow">MCI / protected workspace</div>
            <div style={{ fontSize: '.83rem', fontWeight: 700, marginTop: '.25rem' }}>University well-being operations</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.55rem' }}><Link href="/" className="secondary-button" style={{ textDecoration: 'none', minHeight: '2.35rem', padding: '.5rem .7rem', fontSize: '.72rem' }} data-testid="link-student-view"><Home size={14} /> Student view</Link><button className="icon-button" aria-label="Open admin settings" data-testid="button-admin-settings"><Settings2 size={16} /></button><button className="icon-button" aria-label="Sign out of staff workspace" onClick={signOut} data-testid="button-admin-sign-out"><LogOut size={16} /></button></div>
        </header>
        {children}
      </div>
    </div>
  );
}

function StudentHome() {
  const { state } = useApp();
  const [, navigate] = useLocation();
  const latest = state.checkins[state.checkins.length - 1];
  const completedToday = latest?.date === 'Today';
  return (
    <StudentShell>
      <div className="animate-rise">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1.25rem' }}>
          <div><div className="eyebrow">Friday, 18 October</div><h1 className="display" style={{ fontSize: '2.15rem', margin: '.35rem 0 0' }}>A small check-in<br />can change the day.</h1></div>
           <div className="pill" style={{ background: 'hsl(var(--accent) / .34)', color: 'hsl(var(--accent-foreground))' }}><SunMedium size={13} /> 12° campus</div>
        </div>
        <div className="hero-card">
          <div className="pill" style={{ background: 'hsl(43 38% 95% / .13)', color: 'hsl(43 38% 95%)' }}><Sparkles size={13} /> Your space, your pace</div>
          <h2 className="display" style={{ fontSize: '1.65rem', lineHeight: 1.08, maxWidth: 290, margin: '1.2rem 0 .55rem' }}>{completedToday ? 'You made space for yourself today.' : 'How is your inner weather today?'}</h2>
          <p style={{ color: 'hsl(43 38% 95% / .7)', fontSize: '.78rem', maxWidth: 290, lineHeight: 1.55, margin: '0 0 1.15rem' }}>{completedToday ? 'Your check-in is private to you. Notice what feels useful, then keep moving.' : 'A two-minute, private pause to notice what is here. No labels, no judgment.'}</p>
          <button className="primary-button" onClick={() => navigate('/check-in')} data-testid="button-start-checkin">{completedToday ? 'View today’s check-in' : 'Start a check-in'} <ArrowRight size={15} /></button>
        </div>
      </div>

      <div className="card-flat animate-rise animate-rise-1" style={{ padding: '1rem', marginTop: '.85rem' }} data-testid="card-support-priority">
        <div style={{ display: 'flex', alignItems: 'start', gap: '.7rem' }}>
          <ShieldCheck size={18} style={{ color: 'hsl(var(--primary))', marginTop: '.1rem' }} />
          <div>
            <div className="eyebrow">Your support level</div>
            <div style={{ fontWeight: 700, fontSize: '.84rem', marginTop: '.2rem' }}>General well-being support</div>
            <p className="muted" style={{ fontSize: '.71rem', lineHeight: 1.5, margin: '.3rem 0 0' }}>A non-diagnostic view of recent check-ins. It is a prompt for care, not a medical conclusion.</p>
          </div>
        </div>
      </div>

      <div className="section-heading"><h2>Your rhythm</h2><Link href="/wellness" data-testid="link-see-trends">See trends <ChevronRight size={13} style={{ verticalAlign: 'middle' }} /></Link></div>
      <div className="card animate-rise animate-rise-1" style={{ padding: '1rem' }} data-testid="card-rhythm">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.8rem' }}><div><div className="mini-label">Last 7 days</div><div style={{ fontWeight: 700, fontSize: '.87rem' }}>{state.checkins.length > 3 ? 'You are noticing patterns' : 'Your check-ins are building a picture'}</div></div><div className="pill" style={{ color: 'hsl(var(--primary))', background: 'hsl(var(--secondary))' }}><TrendingUp size={13} /> gentle progress</div></div>
        <svg className="sparkline" viewBox="0 0 360 54" preserveAspectRatio="none" role="img" aria-label="A gentle upward check-in trend">
          <path d="M0 39 C28 42, 42 33, 65 36 S99 48, 124 35 S158 28, 181 31 S216 18, 241 27 S273 30, 295 18 S329 22, 360 10" fill="none" stroke="hsl(var(--primary))" strokeWidth="3" strokeLinecap="round" />
          <path d="M0 39 C28 42, 42 33, 65 36 S99 48, 124 35 S158 28, 181 31 S216 18, 241 27 S273 30, 295 18 S329 22, 360 10 L360 54 L0 54Z" fill="hsl(var(--secondary) / .55)" />
        </svg>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="mini-label">Mon</span><span className="mini-label">Today</span></div>
      </div>

      <div className="section-heading"><h2>One useful next step</h2><Link href="/wellness" data-testid="link-explore-wellness">Explore all</Link></div>
      <div className="card-flat animate-rise animate-rise-2" style={{ padding: '1rem', display: 'flex', gap: '.85rem', alignItems: 'center' }}>
        <div style={{ width: 43, height: 43, display: 'grid', placeItems: 'center', borderRadius: '.8rem', background: 'hsl(var(--accent) / .35)', color: 'hsl(27 55% 34%)', flexShrink: 0 }}><BookOpen size={19} /></div>
        <div style={{ flex: 1 }}><div className="eyebrow" style={{ color: 'hsl(27 55% 34%)' }}>3 minute reset</div><div style={{ fontWeight: 700, fontSize: '.84rem', marginTop: '.16rem' }}>Make a softer landing between classes</div></div>
        <Link href="/wellness" className="icon-button" aria-label="Open wellness activity" data-testid="link-open-activity"><ArrowRight size={15} /></Link>
      </div>

      <div className="section-heading"><h2>Close to campus</h2><Link href="/community" data-testid="link-see-community">See events</Link></div>
      <div className="card-flat animate-rise animate-rise-3" style={{ padding: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '.8rem' }}><div><div className="pill" style={{ color: 'hsl(var(--primary))', background: 'hsl(var(--secondary))' }}><CalendarDays size={13} /> Today · 4:30 PM</div><div style={{ fontFamily: 'var(--app-font-serif)', fontSize: '1.12rem', marginTop: '.65rem' }}>Well-being Hour</div><p className="muted" style={{ fontSize: '.74rem', lineHeight: 1.45, margin: '.3rem 0 0' }}>A low-pressure hour in the garden room. Come as you are.</p></div><div style={{ color: 'hsl(var(--accent-foreground))', background: 'hsl(var(--accent) / .3)', borderRadius: '.6rem', padding: '.42rem' }}><UsersRound size={17} /></div></div>
        <Link href="/community" className="secondary-button" style={{ marginTop: '.95rem', textDecoration: 'none' }} data-testid="link-event-details">View details <ArrowRight size={14} /></Link>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', margin: '1.5rem 0 .3rem', color: 'hsl(var(--muted-foreground))', fontSize: '.68rem' }}><LockKeyhole size={13} /> Your reflections stay private unless you choose to share.</div>
    </StudentShell>
  );
}

const moodChoices = [
  ['Good', 'A little lightness'], ['Okay', 'Getting through it'], ['A little low', 'More weight than usual'], ['Hard', 'Today feels difficult'],
];
const energyChoices = [['Full', 'I have some fuel'], ['Some energy', 'Enough for a few things'], ['Low', 'Running on reserve'], ['Drained', 'Very little in the tank']];
const stressChoices = [['Manageable', 'Within my capacity'], ['Some', 'Taking more effort'], ['A lot', 'Hard to put down'], ['Overwhelming', 'I need support now']];
const sleepChoices = [['Restful', 'Mostly restorative'], ['Uneven', 'Some disruption'], ['Poor', 'Hard to recharge'], ['Very poor', 'Barely resting']];

function CheckInPage() {
  const { state, updateState, notify } = useApp();
  const [step, setStep] = useState(1);
  const [mood, setMood] = useState('');
  const [energy, setEnergy] = useState('');
  const [stress, setStress] = useState('');
  const [sleep, setSleep] = useState('');
  const [safety, setSafety] = useState('');
  const [done, setDone] = useState(false);
  const today = state.checkins[state.checkins.length - 1]?.date === 'Today';

  const complete = () => {
    if (!mood || !energy || !stress || !sleep || !safety) return;
    const entry: Checkin = { id: `checkin-${Date.now()}`, date: 'Today', mood, energy, stress, sleep, safety };
    updateState({ checkins: [...state.checkins.filter((item) => item.date !== 'Today'), entry] });
    setDone(true);
    notify('Check-in saved privately');
  };
  if (done) return <StudentShell><div className="animate-rise" style={{ paddingTop: '2rem' }}><div style={{ width: 58, height: 58, borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'hsl(var(--secondary))', color: 'hsl(var(--primary))', marginBottom: '1.2rem' }}><Check size={28} /></div><div className="eyebrow">Saved to your space</div><h1 className="display" style={{ fontSize: '2rem', margin: '.35rem 0 .6rem' }}>Thank you for<br />checking in.</h1><p className="muted" style={{ fontSize: '.84rem', lineHeight: 1.6, maxWidth: 340 }}>This is a moment of noticing, not a verdict. Your answers are stored privately and can only be shared through your choices.</p>{safety === 'Yes' && <div className="alert-card" style={{ marginTop: '1.3rem' }}><div style={{ display: 'flex', gap: '.65rem' }}><Phone size={18} /><div><strong style={{ fontSize: '.85rem' }}>You may need immediate support.</strong><p style={{ fontSize: '.74rem', lineHeight: 1.5, margin: '.35rem 0 .8rem' }}>Thank you for saying so. MCI is not an emergency service. Contact local emergency services or a trusted person near you now if you may be in immediate danger.</p><Link href="/support" className="secondary-button" style={{ textDecoration: 'none' }} data-testid="link-crisis-support">Open immediate support options <ArrowRight size={14} /></Link></div></div></div>}<div style={{ display: 'flex', gap: '.65rem', marginTop: '1.6rem' }}><Link href="/" className="primary-button" style={{ textDecoration: 'none' }} data-testid="link-checkin-home">Back home</Link><Link href="/wellness" className="secondary-button" style={{ textDecoration: 'none' }} data-testid="link-checkin-wellness">Find a next step</Link></div></div></StudentShell>;

  return (
    <StudentShell>
      <div className="animate-rise">
        <Link href="/" className="ghost-button" style={{ paddingLeft: 0, textDecoration: 'none' }} data-testid="link-checkin-back"><ArrowLeft size={15} /> Back</Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', margin: '1.2rem 0 .7rem' }}><div><div className="eyebrow">Private check-in</div><h1 className="display" style={{ fontSize: '1.8rem', margin: '.3rem 0 0' }}>A pause, together.</h1></div><span className="muted" style={{ fontSize: '.72rem' }}>Step {step} of 5</span></div>
        <div className="progress-track"><span style={{ width: `${(step / 5) * 100}%` }} /></div>
        <p className="muted" style={{ fontSize: '.75rem', lineHeight: 1.5, margin: '.8rem 0 1.4rem' }}>There are no right answers. Choose what is closest, or skip this for now.</p>
      </div>
      {step === 1 && <CheckinChoice title="How has your mood been landing today?" choices={moodChoices} value={mood} setValue={setMood} testPrefix="mood" />}
      {step === 2 && <CheckinChoice title="How much stress have you been carrying?" choices={stressChoices} value={stress} setValue={setStress} testPrefix="stress" />}
      {step === 3 && <CheckinChoice title="How has your sleep been recently?" choices={sleepChoices} value={sleep} setValue={setSleep} testPrefix="sleep" />}
      {step === 4 && <CheckinChoice title="How much energy is available to you?" choices={energyChoices} value={energy} setValue={setEnergy} testPrefix="energy" />}
      {step === 5 && <div className="animate-rise"><h2 className="display" style={{ fontSize: '1.42rem', margin: '0 0 .45rem' }}>Before you go — how safe do you feel right now?</h2><p className="muted" style={{ fontSize: '.75rem', lineHeight: 1.5 }}>This helps us show the right kind of support. It does not diagnose anything. If you choose that you may not be safe, the next screen will put human support first.</p><div className="choice-grid" style={{ marginTop: '1.15rem' }}><button className={`choice ${safety === 'No' ? 'selected' : ''}`} onClick={() => setSafety('No')} data-testid="button-safety-no"><strong>Safe enough for now</strong><span>I can take my next step</span></button><button className={`choice ${safety === 'Yes' ? 'selected' : ''}`} onClick={() => setSafety('Yes')} data-testid="button-safety-yes"><strong>I may not be safe</strong><span>I need human support now</span></button></div>{safety === 'Yes' && <div className="alert-card" style={{ marginTop: '1rem' }}><div style={{ display: 'flex', gap: '.55rem', alignItems: 'start' }}><Info size={16} /><span style={{ fontSize: '.73rem', lineHeight: 1.5 }}>You are not alone. We will show configured emergency, crisis, trusted-person, and campus support options immediately after this check-in.</span></div></div>}</div>}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '.7rem', marginTop: '2rem' }}>{step > 1 ? <button className="secondary-button" onClick={() => setStep(step - 1)} data-testid="button-checkin-previous"><ArrowLeft size={14} /> Previous</button> : <span />}{step < 5 ? <button className="primary-button" disabled={step === 1 ? !mood : step === 2 ? !stress : step === 3 ? !sleep : !energy} onClick={() => setStep(step + 1)} data-testid="button-checkin-next">Continue <ArrowRight size={14} /></button> : <button className="primary-button" disabled={!safety || today} onClick={complete} data-testid="button-complete-checkin">{today ? 'Saved for today' : 'Save check-in'} <Check size={14} /></button>}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginTop: '2rem', color: 'hsl(var(--muted-foreground))', fontSize: '.67rem' }}><LockKeyhole size={13} /> Stored on this demo device. You control what is shared.</div>
    </StudentShell>
  );
}

function CheckinChoice({ title, choices, value, setValue, testPrefix }: { title: string; choices: string[][]; value: string; setValue: (value: string) => void; testPrefix: string }) {
  return <div className="animate-rise"><h2 className="display" style={{ fontSize: '1.42rem', margin: 0 }}>{title}</h2><div className="choice-grid" style={{ marginTop: '1.2rem' }}>{choices.map(([label, description]) => <button key={label} className={`choice ${value === label ? 'selected' : ''}`} onClick={() => setValue(label)} data-testid={`button-${testPrefix}-${label.toLowerCase().replaceAll(' ', '-')}`}><strong>{label}</strong><span>{description}</span></button>)}</div></div>;
}

function WellnessPage() {
  const { state, updateState, notify } = useApp();
  const activities = [
    { id: 'walk', title: 'Take a campus reset', detail: 'A 10-minute walk without a destination.', icon: Activity, color: 'hsl(var(--secondary))' },
    { id: 'breathe', title: 'Arrive in the room', detail: 'A quiet 3-minute breathing guide.', icon: Wind, color: 'hsl(var(--accent) / .35)' },
    { id: 'focus', title: 'Make a gentle plan', detail: 'Choose one thing that is enough for today.', icon: ClipboardCheck, color: 'hsl(197 35% 87%)' },
  ];
  const toggle = (id: string) => {
    const saved = state.savedActivities.includes(id) ? state.savedActivities.filter((item) => item !== id) : [...state.savedActivities, id];
    updateState({ savedActivities: saved });
    notify(saved.includes(id) ? 'Activity saved to your toolkit' : 'Activity removed from your toolkit');
  };
  return <StudentShell><div className="animate-rise"><div className="eyebrow">Your toolkit</div><h1 className="display" style={{ fontSize: '2rem', margin: '.35rem 0 .55rem' }}>Wellness, without<br />the performance.</h1><p className="muted" style={{ fontSize: '.8rem', lineHeight: 1.55, maxWidth: 350 }}>Small, evidence-informed invitations for the in-between moments. Keep what helps; leave the rest.</p></div><div className="section-heading"><h2>Saved by you</h2><span className="mini-label">{state.savedActivities.length} activities</span></div><div className="card" style={{ padding: '.25rem 1rem' }}>{activities.filter((item) => state.savedActivities.includes(item.id)).length ? activities.filter((item) => state.savedActivities.includes(item.id)).map((item) => <ActivityRow key={item.id} item={item} saved={true} onToggle={toggle} />) : <div className="empty-state" style={{ padding: '1.5rem .5rem' }}><Sprout size={22} style={{ color: 'hsl(var(--primary))' }} /><div style={{ fontSize: '.8rem', marginTop: '.5rem' }}>Your toolkit is waiting for one useful thing.</div></div>}</div><div className="section-heading"><h2>Try something small</h2><span className="pill" style={{ color: 'hsl(var(--primary))', background: 'hsl(var(--secondary))' }}><Sparkles size={12} /> no pressure</span></div><div style={{ display: 'grid', gap: '.7rem' }}>{activities.map((item) => <ActivityRow key={item.id} item={item} saved={state.savedActivities.includes(item.id)} onToggle={toggle} />)}</div><div className="section-heading"><h2>What you have noticed</h2><Link href="/check-in" data-testid="link-wellness-checkin">New check-in</Link></div><div className="card-flat" style={{ padding: '1rem' }}><div style={{ display: 'flex', gap: '.7rem', alignItems: 'start' }}><TrendingUp size={18} style={{ color: 'hsl(var(--primary))', marginTop: '.15rem' }} /><div><strong style={{ fontSize: '.84rem' }}>Your check-ins are yours to interpret.</strong><p className="muted" style={{ fontSize: '.73rem', lineHeight: 1.5, margin: '.35rem 0 0' }}>MCI does not turn them into a clinical score. Look for what you want to understand, and reach out when support would help.</p></div></div></div></StudentShell>;
}

function ActivityRow({ item, saved, onToggle }: { item: { id: string; title: string; detail: string; icon: LucideIcon; color: string }; saved: boolean; onToggle: (id: string) => void }) {
  const Icon = item.icon;
  return <div className="card-flat" style={{ display: 'flex', alignItems: 'center', gap: '.85rem', padding: '.8rem' }} data-testid={`card-activity-${item.id}`}><div style={{ width: 40, height: 40, display: 'grid', placeItems: 'center', background: item.color, borderRadius: '.75rem', color: 'hsl(var(--primary))', flexShrink: 0 }}><Icon size={18} /></div><div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: '.82rem' }}>{item.title}</div><div className="muted" style={{ fontSize: '.7rem', marginTop: '.18rem' }}>{item.detail}</div></div><button className={saved ? 'icon-button' : 'secondary-button'} onClick={() => onToggle(item.id)} aria-label={saved ? `Remove ${item.title}` : `Save ${item.title}`} data-testid={`button-save-${item.id}`}>{saved ? <Check size={15} /> : <Plus size={15} />}{!saved && <span>Save</span>}</button></div>;
}

function CommunityPage() {
  const { state, updateState, notify } = useApp();
  const register = () => { updateState({ registeredEvent: !state.registeredEvent }); notify(state.registeredEvent ? 'Registration cancelled' : 'You are registered for Well-being Hour'); };
  return <StudentShell><div className="animate-rise"><div className="eyebrow">Campus, at a human pace</div><h1 className="display" style={{ fontSize: '2rem', margin: '.35rem 0 .55rem' }}>Find your people,<br />not another obligation.</h1><p className="muted" style={{ fontSize: '.8rem', lineHeight: 1.55 }}>Low-pressure gatherings and useful places to land. Browse quietly or show up.</p></div><div className="section-heading"><h2>Next on campus</h2><span className="mini-label">3 opportunities</span></div><div className="hero-card" style={{ background: 'hsl(27 61% 68%)', color: 'hsl(157 33% 21%)' }}><div className="pill" style={{ background: 'hsl(43 38% 95% / .45)', color: 'hsl(157 33% 21%)' }}><CalendarDays size={13} /> Today · 4:30 PM</div><h2 className="display" style={{ fontSize: '1.65rem', margin: '1rem 0 .45rem' }}>Well-being Hour</h2><p style={{ fontSize: '.78rem', lineHeight: 1.5, opacity: .78, maxWidth: 300, margin: 0 }}>Garden room · drop-in · hosted by student peer guides</p><button className="primary-button" style={{ marginTop: '1.15rem', background: 'hsl(157 33% 24%)', color: 'hsl(43 38% 95%)' }} onClick={register} data-testid="button-register-event">{state.registeredEvent ? <><Check size={14} /> Registered</> : <>Save my place <ArrowRight size={14} /></>}</button></div><div className="card-flat" style={{ marginTop: '.8rem', padding: '1rem' }}><div style={{ display: 'flex', gap: '.75rem' }}><div style={{ color: 'hsl(var(--primary))' }}><BookOpen size={18} /></div><div><div className="pill" style={{ background: 'hsl(var(--secondary))', color: 'hsl(var(--primary))' }}>Tomorrow · 12:15 PM</div><div style={{ fontFamily: 'var(--app-font-serif)', fontSize: '1.05rem', marginTop: '.55rem' }}>Study beside someone</div><p className="muted" style={{ fontSize: '.72rem', margin: '.25rem 0 .8rem' }}>Library east terrace · bring whatever you are working on</p><button className="ghost-button" style={{ paddingLeft: 0 }} onClick={() => notify('Event details saved for later')} data-testid="button-save-study-event">Save for later <ArrowRight size={14} /></button></div></div></div><div className="section-heading"><h2>People-powered support</h2></div><div className="card" style={{ padding: '1rem' }}><div style={{ display: 'flex', gap: '.7rem' }}><div style={{ width: 38, height: 38, display: 'grid', placeItems: 'center', borderRadius: '.7rem', background: 'hsl(var(--secondary))', color: 'hsl(var(--primary))' }}><HeartHandshake size={18} /></div><div><strong style={{ fontSize: '.84rem' }}>Peer guides are students too.</strong><p className="muted" style={{ fontSize: '.72rem', lineHeight: 1.5, margin: '.3rem 0 0' }}>Ask for a listening ear, help finding campus services, or just a place to start.</p></div></div></div></StudentShell>;
}

type LiveRoom = { id: string; slug: string; name: string; description: string; accent: string; visibility: string; memberCount: number; joined: boolean; channels?: LiveChannel[] };
type LiveChannel = { id: string; slug: string; name: string; topic: string };
type LiveMessage = { id: string; username: string; content: string; createdAt: string; reactions: number; replyCount: number };
type StudentUser = { id: string; username: string; email: string; interests: string; bio: string };

function StudentCommunityAuth({ onAuthenticated }: { onAuthenticated: (user: StudentUser) => void }) {
  const [registering, setRegistering] = useState(true); const [email, setEmail] = useState(''); const [username, setUsername] = useState(''); const [password, setPassword] = useState(''); const [interests, setInterests] = useState<string[]>([]); const [error, setError] = useState(''); const interestOptions = ['Study', 'Music', 'Gaming', 'Art', 'Sports', 'Tech', 'Books', 'First year'];
  const submit = async (event: FormEvent) => { event.preventDefault(); setError(''); const endpoint = registering ? '/api/auth/student/register' : '/api/auth/student/login'; const body = registering ? { email, username, password, interests } : { email, password }; const response = await fetch(endpoint, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); const result = await response.json().catch(() => ({})); if (!response.ok) { setError(result.message ?? 'Could not sign in.'); return; } onAuthenticated(result.user); };
  return <StudentShell><div className="community-auth-page animate-rise"><div className="community-auth-copy"><div className="eyebrow">A private campus network</div><h1 className="display">Bring your interests.<br />Choose your people.</h1><p className="muted">Create a pseudonymous profile and join conversations without putting your real identity in public rooms.</p><div className="auth-trust"><div><ShieldCheck size={16} /><span>Username-first identity</span></div><div><UsersRound size={16} /><span>Rooms shaped by students</span></div><div><LockKeyhole size={16} /><span>You choose what to share</span></div></div></div><form className="card community-auth-form" onSubmit={submit}><div className="auth-tabs"><button type="button" className={registering ? 'active' : ''} onClick={() => setRegistering(true)}>Create profile</button><button type="button" className={!registering ? 'active' : ''} onClick={() => setRegistering(false)}>Sign in</button></div>{registering && <label className="field-label">Username<input className="input-field" required value={username} onChange={(event) => setUsername(event.target.value)} placeholder="e.g. quietcomet" data-testid="input-student-username" /></label>}<label className="field-label">Email<input className="input-field" required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" data-testid="input-student-email" /></label><label className="field-label">Password<input className="input-field" required minLength={8} type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" data-testid="input-student-password" /></label>{registering && <div><div className="eyebrow" style={{ marginBottom: '.5rem' }}>What are you into?</div><div className="interest-picks">{interestOptions.map((interest) => <button type="button" key={interest} className={interests.includes(interest) ? 'selected' : ''} onClick={() => setInterests((current) => current.includes(interest) ? current.filter((item) => item !== interest) : [...current, interest])}>{interest}</button>)}</div></div>}{error && <div className="form-error">{error}</div>}<button className="primary-button" type="submit" style={{ width: '100%', minHeight: '3rem' }}>{registering ? 'Create my community profile' : 'Sign in to community'} <ArrowRight size={15} /></button></form></div></StudentShell>;
}

function CommunityLivePage() {
  const { notify } = useApp(); const [user, setUser] = useState<StudentUser | null>(null); const [rooms, setRooms] = useState<LiveRoom[]>([]); const [selectedRoom, setSelectedRoom] = useState<LiveRoom | null>(null); const [selectedChannel, setSelectedChannel] = useState<LiveChannel | null>(null); const [messages, setMessages] = useState<LiveMessage[]>([]); const [draft, setDraft] = useState(''); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [sending, setSending] = useState(false);
  useEffect(() => { fetch('/api/auth/student/me', { credentials: 'include' }).then((response) => response.ok ? response.json() : null).then((result) => { if (result?.authenticated) setUser(result.user); }).finally(() => setLoading(false)); }, []);
  const loadRoom = async (room: LiveRoom) => { if (!room.joined) { setSelectedRoom(room); setSelectedChannel(null); return; } const response = await fetch(`/api/community/rooms/${room.slug}`, { credentials: 'include' }); if (!response.ok) { notify('This community could not be opened.'); return; } const detail = await response.json(); setSelectedRoom({ ...room, channels: detail.channels }); setSelectedChannel(detail.channels[0]); };
  const loadMessages = async (room: LiveRoom, channel: LiveChannel) => { const response = await fetch(`/api/community/rooms/${room.slug}/channels/${channel.slug}/messages`, { credentials: 'include' }); if (response.ok) setMessages(await response.json()); };
  useEffect(() => { if (!user) return; fetch('/api/community/rooms', { credentials: 'include' }).then((response) => response.ok ? response.json() : Promise.reject(new Error('Community database is not connected.'))).then((nextRooms: LiveRoom[]) => { setRooms(nextRooms); const first = nextRooms.find((room) => room.joined) ?? nextRooms[0]; if (first) loadRoom(first); }).catch((reason: Error) => setError(reason.message)); }, [user]);
  useEffect(() => { if (!selectedRoom || !selectedChannel) return; loadMessages(selectedRoom, selectedChannel); const timer = window.setInterval(() => loadMessages(selectedRoom, selectedChannel), 5000); return () => window.clearInterval(timer); }, [selectedRoom, selectedChannel]);
  const joinRoom = async () => { if (!selectedRoom) return; const result = await fetch(`/api/community/rooms/${selectedRoom.slug}/join`, { method: 'POST', credentials: 'include' }).then((response) => response.json()); notify(result.pending ? 'Join request sent to the host.' : 'Community joined.'); if (result.joined) { const joined = { ...selectedRoom, joined: true }; setRooms((current) => current.map((room) => room.id === joined.id ? joined : room)); loadRoom(joined); } };
  const createRoom = async () => { const name = window.prompt('Name your new community'); if (!name?.trim()) return; const description = window.prompt('What is this community for?') ?? ''; if (!description.trim()) return; const visibility = window.confirm('Make this a private community requiring host approval?') ? 'private' : 'public'; const response = await fetch('/api/community/rooms', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, description, visibility }) }); const room = await response.json(); if (!response.ok) { notify(room.message); return; } setRooms((current) => [...current, room]); loadRoom(room); notify('Your community is live.'); };
  const sendMessage = async () => { if (!selectedRoom || !selectedChannel || !draft.trim() || sending) return; setSending(true); const response = await fetch(`/api/community/rooms/${selectedRoom.slug}/channels/${selectedChannel.slug}/messages`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: draft.trim() }) }); const message = await response.json(); if (response.ok) { setMessages((current) => [...current, message]); setDraft(''); } else notify(message.message); setSending(false); };
  const react = async (message: LiveMessage) => { await fetch(`/api/community/messages/${message.id}/react`, { method: 'POST', credentials: 'include' }); setMessages((current) => current.map((item) => item.id === message.id ? { ...item, reactions: item.reactions + 1 } : item)); };
  if (loading) return <StudentShell><div className="community-loading"><Sprout size={22} /><span>Opening your community...</span></div></StudentShell>; if (!user) return <StudentCommunityAuth onAuthenticated={setUser} />; if (error) return <StudentShell><div className="community-error card"><ShieldCheck size={22} /><h1 className="display">Community needs its database.</h1><p>{error}</p><button className="primary-button" onClick={() => window.location.reload()}>Try again <RefreshCw size={14} /></button></div></StudentShell>;
  const orderedRooms = rooms.slice().sort((a, b) => { const interests = user.interests.toLowerCase(); const aMatch = interests && a.name.toLowerCase().split(' ').some((word) => interests.includes(word)); const bMatch = interests && b.name.toLowerCase().split(' ').some((word) => interests.includes(word)); return Number(Boolean(bMatch)) - Number(Boolean(aMatch)); });
  return <StudentShell><div className="live-community"><div className="live-community-head"><div><div className="eyebrow">Campus community</div><h1 className="display">Choose your corner of campus.</h1><p className="muted">Signed in as <strong>{user.username}</strong>. Your email stays private.</p></div><div style={{ display: 'flex', gap: '.45rem' }}><div className="community-privacy"><ShieldCheck size={16} /><span>Pseudonymous</span></div><button className="secondary-button" onClick={async () => { await fetch('/api/auth/student/logout', { method: 'POST', credentials: 'include' }); setUser(null); }}>Sign out</button></div></div><div className="chat-shell"><aside className="room-rail"><div className="room-rail-title"><span>Communities</span><button className="icon-button small-icon" aria-label="Create a community" onClick={createRoom}><Plus size={15} /></button></div>{orderedRooms.map((room, index) => <button key={room.id} className={`room-item ${selectedRoom?.id === room.id ? 'active' : ''}`} onClick={() => loadRoom(room)}><span className={`room-dot room-dot-${room.accent}`} /><span><strong>{index === 0 && user.interests ? 'Suggested · ' : ''}{room.name}</strong><small>{room.memberCount} members {room.visibility === 'private' ? '· private' : room.joined ? '· joined' : '· join to chat'}</small></span></button>)}<div className="room-rail-note"><LockKeyhole size={14} /><span>Hosts can approve private community requests.</span></div></aside><section className="chat-main">{selectedRoom && !selectedRoom.joined ? <div className="private-room-gate"><LockKeyhole size={25} /><h2 className="display">Join {selectedRoom.name}</h2><p>{selectedRoom.description}</p><button className="primary-button" onClick={joinRoom}>{selectedRoom.visibility === 'private' ? 'Request to join' : 'Join community'} <ArrowRight size={14} /></button></div> : <><header className="chat-header"><div><div className="chat-room-name"><span>#</span> {selectedRoom?.name}</div><div className="muted">{selectedRoom?.description}</div></div><div className="chat-header-meta"><UsersRound size={15} /> {selectedRoom?.memberCount}</div></header><div className="channel-tabs">{(selectedRoom?.channels ?? []).map((channel) => <button className={selectedChannel?.id === channel.id ? 'active' : ''} key={channel.id} onClick={() => setSelectedChannel(channel)}><span>#</span>{channel.name}</button>)}</div><div className="message-list">{messages.length ? messages.map((message) => <article className="chat-message" key={message.id}><div className="message-avatar">{message.username.slice(0, 2).toUpperCase()}</div><div className="message-body"><div><strong>{message.username}</strong><span className="muted message-time">{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div><p>{message.content}</p><div className="message-actions"><button onClick={() => react(message)}><HeartHandshake size={13} /> {message.reactions}</button><button onClick={() => notify('Thread replies are coming next.')}><MessageCircle size={13} /> Reply</button><button onClick={() => notify('Report sent to moderators.')}><ShieldCheck size={13} /> Report</button></div></div></article>) : <div className="chat-empty"><MessageCircle size={24} /><h2 className="display">Start the conversation.</h2><p>Be the first person to say hello.</p></div>}</div><div className="chat-composer"><div className="message-avatar composer-avatar">{user.username.slice(0, 2).toUpperCase()}</div><div className="composer-input"><textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); sendMessage(); } }} placeholder={`Message #${selectedChannel?.name ?? 'community'}`} aria-label="Write a chat message" maxLength={2000} /><div><span className="mini-label">Shift + Enter for a new line</span><button className="primary-button" onClick={sendMessage} disabled={!draft.trim() || sending}>{sending ? 'Sending...' : 'Send'} <ArrowRight size={14} /></button></div></div></div></>}</section></div></div></StudentShell>;
}

function CommunityHubPage() {
  const { state, updateState, notify } = useApp();
  const [activeCircle, setActiveCircle] = useState('All circles');
  const [draft, setDraft] = useState('');
  const circles = [
    { id: 'late-night-study', name: 'Late Night Study', members: '428 members', color: 'hsl(var(--secondary))' },
    { id: 'music-makers', name: 'Music Makers', members: '186 members', color: 'hsl(var(--accent) / .38)' },
    { id: 'first-year-corner', name: 'First Year Corner', members: '312 members', color: 'hsl(197 35% 87%)' },
    { id: 'creative-lab', name: 'Creative Lab', members: '94 members', color: 'hsl(15 60% 88%)' },
  ];
  const visiblePosts = activeCircle === 'All circles' ? state.communityPosts : state.communityPosts.filter((post) => post.circle === activeCircle);
  const toggleCircle = (id: string) => {
    const joined = state.joinedCircles.includes(id);
    updateState({ joinedCircles: joined ? state.joinedCircles.filter((circle) => circle !== id) : [...state.joinedCircles, id] });
    notify(joined ? 'Circle left' : 'Circle joined');
  };
  const publish = () => {
    const body = draft.trim();
    if (!body) return;
    const post: CommunityPost = { id: `post-${Date.now()}`, circle: activeCircle === 'All circles' ? 'Late Night Study' : activeCircle, author: 'sunlitfern', avatar: 'SF', title: 'A thought from the community', body, replies: 0, likes: 0, created: 'Just now' };
    updateState({ communityPosts: [post, ...state.communityPosts] });
    setDraft('');
    notify('Posted anonymously to the community');
  };
  const likePost = (id: string) => updateState({ communityPosts: state.communityPosts.map((post) => post.id === id ? { ...post, likes: post.likes + (post.liked ? -1 : 1), liked: !post.liked } : post) });

  return <StudentShell><div className="community-layout animate-rise"><div className="community-intro"><div><div className="eyebrow">Campus community</div><h1 className="display" style={{ fontSize: '2.1rem', margin: '.35rem 0 .5rem' }}>Find your people,<br />at your own pace.</h1><p className="muted" style={{ fontSize: '.8rem', lineHeight: 1.55, maxWidth: 420 }}>Pseudonymous spaces for questions, interests, ideas, and the small things that make campus feel more like yours.</p></div><div className="community-privacy"><ShieldCheck size={16} /><span>Only your chosen username is public.</span></div></div><div className="community-compose card"><div className="community-avatar">SF</div><div style={{ flex: 1 }}><textarea className="input-field community-textarea" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Share something with your circles..." aria-label="Write a community post" data-testid="input-community-post" /><div className="community-compose-footer"><span className="mini-label">Posting as <strong style={{ color: 'hsl(var(--primary))' }}>sunlitfern</strong></span><button className="primary-button" onClick={publish} disabled={!draft.trim()} data-testid="button-publish-post"><Plus size={14} /> Post anonymously</button></div></div></div><div className="community-columns"><aside className="community-sidebar"><div className="community-sidebar-heading"><span className="eyebrow">Your circles</span><span className="mini-label">{state.joinedCircles.length}</span></div><button className={`circle-filter ${activeCircle === 'All circles' ? 'active' : ''}`} onClick={() => setActiveCircle('All circles')}><UsersRound size={16} /><span>All circles</span></button>{circles.map((circle) => <button key={circle.id} className={`circle-filter ${activeCircle === circle.name ? 'active' : ''}`} onClick={() => setActiveCircle(circle.name)}><span className="circle-icon" style={{ background: circle.color }}>{circle.name.slice(0, 1)}</span><span>{circle.name}</span>{state.joinedCircles.includes(circle.id) && <Check size={13} style={{ marginLeft: 'auto' }} />}</button>)}<div className="community-safety"><LockKeyhole size={15} /><strong>Community promise</strong><p>Be curious, protect privacy, and report harm. Real names stay out of public posts.</p></div></aside><main className="community-feed"><div className="community-feed-heading"><div><div className="eyebrow">{activeCircle}</div><h2 className="display">Latest conversations</h2></div><span className="pill" style={{ background: 'hsl(var(--secondary))', color: 'hsl(var(--primary))' }}><MessageCircle size={12} /> {visiblePosts.length} threads</span></div>{visiblePosts.map((post, index) => <article className="community-post card" key={post.id} style={{ animationDelay: `${index * 50}ms` }} data-testid={`card-community-post-${post.id}`}><div className="post-meta"><div className="community-avatar" style={{ background: index % 2 ? 'hsl(var(--accent) / .45)' : 'hsl(var(--secondary))' }}>{post.avatar}</div><div style={{ flex: 1 }}><strong className="post-author">{post.author}</strong><span className="muted post-time"> in {post.circle} · {post.created}</span></div><button className="icon-button small-icon" aria-label={`Report post by ${post.author}`} onClick={() => notify('Thanks. This post was sent to the community team.')}><MoreHorizontal size={15} /></button></div><h3>{post.title}</h3><p>{post.body}</p><div className="post-actions"><button className={`post-action ${post.liked ? 'liked' : ''}`} onClick={() => likePost(post.id)} data-testid={`button-like-${post.id}`}><HeartHandshake size={15} /> {post.likes}</button><button className="post-action" onClick={() => notify('Replies will open in the next community release')}><MessageCircle size={15} /> {post.replies} replies</button><button className="post-action post-report" onClick={() => notify('Thanks. This post was sent to the community team.')}><ShieldCheck size={14} /> Report</button></div></article>)}{!visiblePosts.length && <div className="empty-state card"><Sprout size={24} style={{ color: 'hsl(var(--primary))' }} /><div style={{ marginTop: '.6rem' }}>This circle is ready for its first conversation.</div></div>}</main></div><div className="section-heading"><h2>Explore more circles</h2><span className="mini-label">Choose what fits</span></div><div className="circle-grid">{circles.map((circle) => { const joined = state.joinedCircles.includes(circle.id); return <div className="circle-card card-flat" key={circle.id}><div className="circle-card-icon" style={{ background: circle.color }}>{circle.name.slice(0, 1)}</div><div style={{ flex: 1 }}><strong>{circle.name}</strong><div className="muted" style={{ fontSize: '.68rem', marginTop: '.2rem' }}>{circle.members}</div></div><button className={joined ? 'icon-button small-icon' : 'secondary-button'} onClick={() => toggleCircle(circle.id)} aria-label={joined ? `Leave ${circle.name}` : `Join ${circle.name}`} data-testid={`button-join-${circle.id}`}>{joined ? <Check size={15} /> : <Plus size={15} />}{!joined && <span>Join</span>}</button></div>; })}</div></div></StudentShell>;
}

function SupportPage() {
  const { state, updateState, notify } = useApp();
  const [, navigate] = useLocation();
  const [message, setMessage] = useState('');
  const [urgent, setUrgent] = useState(false);
  const request = () => { updateState({ peerRequested: true }); notify('Peer support request sent'); };
  return <StudentShell><div className="animate-rise"><div className="eyebrow">Human support</div><h1 className="display" style={{ fontSize: '2rem', margin: '.35rem 0 .55rem' }}>You do not have<br />to figure it out alone.</h1><p className="muted" style={{ fontSize: '.8rem', lineHeight: 1.55 }}>Choose the kind of support that feels right. MCI is private and non-diagnostic; people, not scores, are here to help.</p></div><div className="section-heading"><h2>Right now</h2></div><div className="alert-card"><div style={{ display: 'flex', gap: '.7rem' }}><Phone size={19} /><div><strong style={{ fontSize: '.85rem' }}>If you may be in immediate danger</strong><p style={{ fontSize: '.74rem', lineHeight: 1.5, margin: '.3rem 0 .8rem' }}>You are not alone. Use the configured emergency or crisis contact for your campus, or reach a trusted person near you now.</p><button className="secondary-button" onClick={() => setUrgent((value) => !value)} data-testid="button-emergency-guidance">{urgent ? 'Hide emergency guidance' : 'Show emergency guidance'}</button></div></div></div>{urgent && <div className="alert-card" style={{ marginTop: '.7rem', background: 'hsl(var(--card))', color: 'hsl(var(--foreground))' }} data-testid="card-emergency-guidance"><strong style={{ fontSize: '.84rem' }}>Immediate support options</strong><p className="muted" style={{ fontSize: '.73rem', lineHeight: 1.5, margin: '.35rem 0 .8rem' }}>This prototype uses institution-configured contacts. In production, these buttons will call or message the campus emergency service, crisis helpline, trusted person, or on-call support team.</p><div style={{ display: 'grid', gap: '.55rem' }}><button className="primary-button" onClick={() => notify('Campus emergency contact selected')} data-testid="button-call-campus-emergency"><Phone size={14} /> Call campus emergency</button><button className="secondary-button" onClick={() => notify('Trusted person contact selected')} data-testid="button-contact-trusted-person"><UsersRound size={14} /> Contact trusted person</button><button className="ghost-button" onClick={() => notify('Configured crisis resources opened')} data-testid="button-open-crisis-resources">Open configured crisis resources <ArrowRight size={14} /></button></div></div>}<div className="section-heading"><h2>Choose a next connection</h2></div><div className="card" style={{ padding: '.2rem 1rem' }}><SupportOption icon={HeartHandshake} title="Request a peer guide" detail="A trained student can help you find your next step." action={state.peerRequested ? 'Request sent' : 'Request support'} onClick={request} disabled={state.peerRequested} testId="button-request-peer" /><SupportOption icon={MessageCircle} title="Talk with campus support" detail="Find counseling, accessibility, or academic support." action="Browse directory" onClick={() => notify('Campus directory opened for this demo')} testId="button-open-directory" /><SupportOption icon={UsersRound} title="Find a low-pressure space" detail="Explore drop-ins, groups, and community events." action="View community" onClick={() => navigate('/community')} testId="button-support-community" /></div><div className="section-heading"><h2>Tell us what would help</h2></div><div className="card-flat" style={{ padding: '1rem' }}><label htmlFor="support-message" className="eyebrow">Optional note</label><textarea id="support-message" className="input-field" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="A sentence is enough. Avoid sharing anything you would not want stored on this demo device." rows={3} style={{ marginTop: '.55rem', resize: 'vertical' }} data-testid="input-support-message" /><button className="primary-button" style={{ marginTop: '.7rem' }} onClick={() => { setMessage(''); notify('Your note was kept private in this demo'); }} data-testid="button-save-support-note">Save note privately <LockKeyhole size={14} /></button></div></StudentShell>;
}

function SupportOption({ icon: Icon, title, detail, action, onClick, disabled, testId }: { icon: typeof HeartHandshake; title: string; detail: string; action: string; onClick: () => void; disabled?: boolean; testId: string }) {
  return <div style={{ display: 'flex', alignItems: 'center', gap: '.7rem', padding: '1rem 0', borderBottom: '1px solid hsl(var(--border))' }}><div style={{ color: 'hsl(var(--primary))' }}><Icon size={19} /></div><div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: '.81rem' }}>{title}</div><div className="muted" style={{ fontSize: '.69rem', marginTop: '.2rem', lineHeight: 1.4 }}>{detail}</div></div><button className={disabled ? 'icon-button' : 'ghost-button'} onClick={onClick} disabled={disabled} data-testid={testId}>{disabled ? <Check size={15} /> : <>{action} <ArrowRight size={14} /></>}</button></div>;
}

function CommunityProfilePage() {
  const [user, setUser] = useState<StudentUser | null>(null); const [loading, setLoading] = useState(true); const [, navigate] = useLocation();
  useEffect(() => { fetch('/api/auth/student/me', { credentials: 'include' }).then((response) => response.ok ? response.json() : null).then((result) => setUser(result?.user ?? null)).finally(() => setLoading(false)); }, []);
  if (loading) return <StudentShell><div className="community-loading"><Sprout size={22} /><span>Loading your profile...</span></div></StudentShell>;
  if (!user) return <StudentShell><div className="community-error card"><UserRound size={22} /><h1 className="display">Your community profile starts here.</h1><p>Choose a pseudonym and interests before joining conversations.</p><button className="primary-button" onClick={() => navigate('/community')}>Create profile <ArrowRight size={14} /></button></div></StudentShell>;
  return <StudentShell><div className="animate-rise"><div className="eyebrow">Your community identity</div><h1 className="display" style={{ fontSize: '2rem', margin: '.35rem 0 .55rem' }}>A profile that stays yours.</h1><p className="muted" style={{ fontSize: '.8rem', lineHeight: 1.55 }}>Your email helps you sign in. Your username is what people see in community rooms.</p></div><div className="card community-profile-card"><div className="community-avatar profile-avatar">{user.username.slice(0, 2).toUpperCase()}</div><div><div className="eyebrow">Public username</div><h2 className="display">{user.username}</h2><div className="muted" style={{ fontSize: '.7rem' }}>{user.email}</div></div></div><div className="section-heading"><h2>Your interests</h2><span className="pill" style={{ background: 'hsl(var(--secondary))', color: 'hsl(var(--primary))' }}><Sparkles size={12} /> used for suggestions</span></div><div className="interest-picks profile-interests">{(user.interests ? user.interests.split(',') : ['Add interests from Community']).map((interest) => <span key={interest}>{interest}</span>)}</div><div className="card-flat profile-privacy-note"><LockKeyhole size={16} /><div><strong>Privacy by design</strong><p>Your real name and email never appear in messages, room listings, or profiles.</p></div></div></StudentShell>;
}

function ProfilePage() {
  const { state, updateState, notify } = useApp();
  const setConsent = (key: keyof DemoState['consent']) => { updateState({ consent: { ...state.consent, [key]: !state.consent[key] } }); notify('Privacy setting updated'); };
  return <StudentShell><div className="animate-rise"><div className="eyebrow">Your space</div><h1 className="display" style={{ fontSize: '2rem', margin: '.35rem 0 .55rem' }}>Profile & privacy</h1><p className="muted" style={{ fontSize: '.8rem', lineHeight: 1.55 }}>You are in control of what is remembered, used, and shared.</p></div><div className="card" style={{ padding: '1rem', marginTop: '1.35rem' }}><div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}><div style={{ width: 44, height: 44, borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'hsl(var(--accent) / .45)', color: 'hsl(27 55% 34%)', fontFamily: 'var(--app-font-serif)', fontSize: '1.15rem' }}>AR</div><div><div style={{ fontWeight: 700, fontSize: '.9rem' }}>Alex Rivera</div><div className="muted" style={{ fontSize: '.7rem' }}>Northbridge University · Year 2</div></div><button className="icon-button" style={{ marginLeft: 'auto' }} aria-label="Edit profile" onClick={() => notify('Profile editing is ready in this demo')} data-testid="button-edit-profile"><MoreHorizontal size={16} /></button></div></div><div className="section-heading"><h2>Consent & control</h2><span className="pill" style={{ color: 'hsl(var(--primary))', background: 'hsl(var(--secondary))' }}><LockKeyhole size={12} /> private by default</span></div><div className="card" style={{ padding: '0 1rem' }}><ConsentRow title="Save my check-in trends" detail="Keep your check-ins on this device so you can notice patterns over time." on={state.consent.trendStorage} onToggle={() => setConsent('trendStorage')} testId="switch-trend-storage" /><ConsentRow title="Tailor small suggestions" detail="Use your chosen topics to make the wellness toolkit more relevant." on={state.consent.tailoredSupport} onToggle={() => setConsent('tailoredSupport')} testId="switch-tailored-support" /><ConsentRow title="Allow follow-up contact" detail="Let a peer guide contact you after you ask for support." on={state.consent.contactPermission} onToggle={() => setConsent('contactPermission')} testId="switch-contact-permission" /></div><div className="section-heading"><h2>Data on this demo device</h2></div><div className="card-flat" style={{ padding: '1rem' }}><div style={{ display: 'flex', gap: '.65rem', alignItems: 'start' }}><FileKey2 size={18} style={{ color: 'hsl(var(--primary))' }} /><div><strong style={{ fontSize: '.82rem' }}>Your demo data is local.</strong><p className="muted" style={{ fontSize: '.72rem', lineHeight: 1.5, margin: '.32rem 0 .75rem' }}>MCI stores fictional demo activity in localStorage only. In a real deployment, retention, access, and deletion policies would be explicit.</p><button className="secondary-button" onClick={() => notify('Export prepared for this demo device')} data-testid="button-export-data">Export my data <ArrowRight size={14} /></button></div></div></div><button className="ghost-button" style={{ marginTop: '1.2rem', paddingLeft: 0 }} onClick={() => notify('Signed out of the demo')} data-testid="button-sign-out"><LogOut size={15} /> Sign out of demo</button></StudentShell>;
}

function ConsentRow({ title, detail, on, onToggle, testId }: { title: string; detail: string; on: boolean; onToggle: () => void; testId: string }) {
  return <div className="switch-row"><div><div style={{ fontSize: '.81rem', fontWeight: 700 }}>{title}</div><div className="muted" style={{ fontSize: '.69rem', lineHeight: 1.45, marginTop: '.22rem', maxWidth: 270 }}>{detail}</div></div><button className={`switch ${on ? 'on' : ''}`} role="switch" aria-checked={on} aria-label={title} onClick={onToggle} data-testid={testId}><span /></button></div>;
}

function AdminOverview() {
  const { state, notify } = useApp();
  const total = state.cases.length;
  return <AdminShell><div className="page-wrap"><div className="animate-rise" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: '1rem', flexWrap: 'wrap' }}><div><div className="eyebrow">Friday, 18 October · demo snapshot</div><h1 className="display" style={{ fontSize: '2.35rem', margin: '.3rem 0 .45rem' }}>A clearer view of<br />student support.</h1><p className="muted" style={{ fontSize: '.81rem', margin: 0 }}>Anonymized signals for human-led programs, never individual surveillance.</p></div><div className="pill" style={{ color: 'hsl(var(--primary))', background: 'hsl(var(--secondary))' }}><ShieldCheck size={14} /> Privacy guardrails on</div></div><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '.75rem', marginTop: '1.7rem' }}><AdminStat label="Active students" value="1,248" detail="+8.4% this term" icon={UsersRound} /><AdminStat label="Check-ins this week" value="684" detail="54.8% participation" icon={ClipboardCheck} /><AdminStat label="Open support cases" value={String(total)} detail="Needs a human next step" icon={MessageCircle} /><AdminStat label="Programs running" value="12" detail="Across 4 campus zones" icon={Sprout} /></div><div className="admin-two-col" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.35fr) minmax(260px, .65fr)', gap: '1rem', marginTop: '1rem' }}><div className="card" style={{ padding: '1.2rem' }}><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><div><div className="eyebrow">Participation pulse</div><h2 className="display" style={{ fontSize: '1.35rem', margin: '.35rem 0 0' }}>More students are pausing</h2></div><button className="icon-button" aria-label="More participation details" onClick={() => notify('Participation details are anonymized for this demo')} data-testid="button-pulse-details"><MoreHorizontal size={16} /></button></div><div style={{ height: 170, display: 'flex', alignItems: 'end', gap: 'clamp(.45rem, 2vw, 1rem)', padding: '1.2rem .4rem .4rem', borderBottom: '1px solid hsl(var(--border))', marginTop: '.9rem' }}>{[38, 52, 46, 67, 61, 74, 83].map((height, index) => <div key={index} style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'end', alignItems: 'center', gap: '.45rem' }}><div style={{ width: '100%', maxWidth: 42, height: `${height}%`, borderRadius: '.5rem .5rem .15rem .15rem', background: index === 6 ? 'hsl(var(--primary))' : 'hsl(var(--secondary))', transition: 'height .4s ease' }} data-testid={`bar-participation-${index}`} /><span className="mini-label">{['M', 'T', 'W', 'T', 'F', 'S', 'S'][index]}</span></div>)}</div><div style={{ display: 'flex', gap: '1.2rem', marginTop: '.9rem' }}><div><div className="stat-number" style={{ fontSize: '1.35rem' }}>68.4%</div><div className="mini-label">weekly rhythm</div></div><div><div className="stat-number" style={{ fontSize: '1.35rem' }}>+12.6%</div><div className="mini-label">since orientation</div></div></div></div><div className="card" style={{ padding: '1.2rem' }}><div className="eyebrow">Support priority</div><h2 className="display" style={{ fontSize: '1.35rem', margin: '.35rem 0 1.1rem' }}>Make room where it matters.</h2><PriorityBar label="Today" value={2} total={total} color="hsl(var(--destructive))" /><PriorityBar label="Review soon" value={1} total={total} color="hsl(var(--accent-foreground))" /><PriorityBar label="Routine" value={1} total={total} color="hsl(var(--primary))" /><div className="card-flat" style={{ padding: '.75rem', marginTop: '1.25rem', background: 'hsl(var(--muted) / .7)' }}><div style={{ display: 'flex', gap: '.5rem', alignItems: 'start' }}><Info size={15} style={{ color: 'hsl(var(--primary))', flexShrink: 0 }} /><span className="muted" style={{ fontSize: '.68rem', lineHeight: 1.45 }}>Priorities are support routing cues, not clinical scores or risk labels.</span></div></div></div></div><div className="section-heading"><h2>Program pulse</h2><Link href="/admin/programs" data-testid="link-overview-programs">Manage programs <ArrowRight size={13} style={{ verticalAlign: 'middle' }} /></Link></div><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '.75rem' }}><ProgramCard title="Well-being Hour" detail="Garden room · 4:30 PM" count="18 registered" status="Active" /><ProgramCard title="First-week landing" detail="Residence halls · ongoing" count="42 visits" status="Active" /><ProgramCard title="Study beside someone" detail="Library terrace · tomorrow" count="9 saved" status="Draft" /></div></div></AdminShell>;
}

function AdminStat({ label, value, detail, icon: Icon }: { label: string; value: string; detail: string; icon: typeof UsersRound }) {
  return <div className="card" style={{ padding: '1rem' }} data-testid={`stat-${label.toLowerCase().replaceAll(' ', '-')}`}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}><span className="mini-label">{label}</span><Icon size={15} style={{ color: 'hsl(var(--primary))' }} /></div><div className="stat-number" style={{ marginTop: '.7rem' }}>{value}</div><div className="muted" style={{ fontSize: '.66rem', marginTop: '.35rem' }}>{detail}</div></div>;
}
function PriorityBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  return <div style={{ marginBottom: '1rem' }}><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.72rem', fontWeight: 700, marginBottom: '.38rem' }}><span>{label}</span><span className="muted">{value}</span></div><div className="progress-track"><span style={{ width: `${Math.max((value / Math.max(total, 1)) * 100, value ? 18 : 0)}%`, background: color }} /></div></div>;
}
function ProgramCard({ title, detail, count, status }: { title: string; detail: string; count: string; status: string }) {
  return <div className="card-flat" style={{ padding: '1rem' }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: '.4rem' }}><strong style={{ fontSize: '.82rem' }}>{title}</strong><span className="pill" style={{ padding: '.25rem .5rem', background: status === 'Active' ? 'hsl(var(--secondary))' : 'hsl(var(--muted))', color: 'hsl(var(--primary))' }}>{status}</span></div><div className="muted" style={{ fontSize: '.7rem', marginTop: '.55rem' }}>{detail}</div><div style={{ fontSize: '.72rem', fontWeight: 700, marginTop: '.9rem' }}>{count}</div></div>;
}

function AdminCases() {
  const { state, updateState, notify } = useApp();
  const [filter, setFilter] = useState<'All' | CaseItem['priority']>('All');
  const filtered = filter === 'All' ? state.cases : state.cases.filter((item) => item.priority === filter);
  const advance = (id: string) => { updateState({ cases: state.cases.map((item) => item.id === id ? { ...item, status: item.status === 'New' ? 'In progress' : 'Connected' } : item) }); notify('Case status updated'); };
  return <AdminShell><div className="page-wrap"><div className="animate-rise" style={{ display: 'flex', alignItems: 'end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}><div><div className="eyebrow">Support queue · anonymized</div><h1 className="display" style={{ fontSize: '2.35rem', margin: '.3rem 0 .45rem' }}>Human next steps,<br />not automated verdicts.</h1><p className="muted" style={{ fontSize: '.81rem', margin: 0 }}>A small working queue for trained campus support teams.</p></div><button className="primary-button" onClick={() => notify('New support resource flow opened')} data-testid="button-add-support-resource"><Plus size={15} /> Add resource</button></div><div style={{ display: 'flex', gap: '.45rem', flexWrap: 'wrap', margin: '1.6rem 0 .8rem' }}>{(['All', 'Today', 'Review soon', 'Routine'] as const).map((item) => <button key={item} className={filter === item ? 'primary-button' : 'secondary-button'} style={{ minHeight: '2.2rem', padding: '.45rem .7rem', fontSize: '.72rem' }} onClick={() => setFilter(item)} data-testid={`button-filter-${item.toLowerCase().replaceAll(' ', '-')}`}>{item}{item !== 'All' && <span style={{ opacity: .7 }}> · {state.cases.filter((caseItem) => caseItem.priority === item).length}</span>}</button>)}</div><div className="card-flat" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '.8rem', padding: '.8rem 1rem', marginBottom: '1rem' }}><div style={{ display: 'flex', alignItems: 'center', gap: '.55rem' }}><Search size={15} className="muted" /><input className="input-field" style={{ border: 0, background: 'transparent', padding: '.25rem 0', width: 210 }} placeholder="Search anonymous IDs" aria-label="Search anonymous IDs" data-testid="input-search-cases" /></div><div className="pill" style={{ background: 'hsl(var(--secondary))', color: 'hsl(var(--primary))' }}><LockKeyhole size={12} /> No journal text shown</div></div>{filtered.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>Case</th><th>Support need</th><th>Priority</th><th>Created</th><th>Status</th><th>Action</th></tr></thead><tbody>{filtered.map((item) => <tr key={item.id} data-testid={`row-case-${item.id}`}><td><div style={{ fontWeight: 700 }}>{item.anon}</div><div className="muted" style={{ fontSize: '.65rem', marginTop: '.2rem' }}>{item.id}</div></td><td>{item.need}</td><td><span className="pill" style={{ background: item.priority === 'Today' ? 'hsl(var(--destructive) / .1)' : item.priority === 'Review soon' ? 'hsl(var(--accent) / .3)' : 'hsl(var(--secondary))', color: item.priority === 'Today' ? 'hsl(var(--destructive))' : 'hsl(var(--foreground))' }}><span className="status-dot" style={{ background: item.priority === 'Today' ? 'hsl(var(--destructive))' : item.priority === 'Review soon' ? 'hsl(var(--accent-foreground))' : 'hsl(var(--primary))' }} />{item.priority}</span></td><td className="muted">{item.created}</td><td><span style={{ color: item.status === 'Connected' ? 'hsl(var(--primary))' : 'hsl(var(--foreground))', fontWeight: 700 }}>{item.status}</span></td><td><button className="ghost-button" onClick={() => advance(item.id)} data-testid={`button-advance-case-${item.id}`}>{item.status === 'Connected' ? <Eye size={14} /> : <ArrowRight size={14} />} {item.status === 'New' ? 'Review' : item.status === 'In progress' ? 'Connect' : 'View'}</button></td></tr>)}</tbody></table></div> : <div className="empty-state card-flat"><CheckCircle2 size={24} style={{ color: 'hsl(var(--primary))' }} /><div style={{ marginTop: '.6rem', fontWeight: 700 }}>No cases in this view</div><p style={{ fontSize: '.75rem' }}>Try another priority filter.</p></div>}<div className="card-flat" style={{ marginTop: '1rem', padding: '1rem' }}><div style={{ display: 'flex', gap: '.6rem' }}><ShieldCheck size={17} style={{ color: 'hsl(var(--primary))' }} /><div><strong style={{ fontSize: '.78rem' }}>Privacy boundary</strong><p className="muted" style={{ fontSize: '.69rem', lineHeight: 1.5, margin: '.25rem 0 0' }}>This queue intentionally excludes raw private journals, diagnostic labels, and individual wellness scores.</p></div></div></div></div></AdminShell>;
}

function AdminPrograms() {
  const { notify } = useApp();
  const [programs, setPrograms] = useState([
    { id: 'well-being-hour', title: 'Well-being Hour', type: 'Drop-in gathering', location: 'Garden room', schedule: 'Today · 4:30 PM', status: 'Published' },
    { id: 'first-week', title: 'First-week landing', type: 'Resource pathway', location: 'Residence halls', schedule: 'Ongoing', status: 'Published' },
    { id: 'study-beside', title: 'Study beside someone', type: 'Community event', location: 'Library east terrace', schedule: 'Tomorrow · 12:15 PM', status: 'Draft' },
  ]);
  const toggle = (id: string) => {
    setPrograms((items) => items.map((item) => item.id === id ? { ...item, status: item.status === 'Published' ? 'Draft' : 'Published' } : item));
    notify('Program visibility updated');
  };
  return <AdminShell><div className="page-wrap"><div className="animate-rise" style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'end', flexWrap: 'wrap' }}><div><div className="eyebrow">Programs & resources</div><h1 className="display" style={{ fontSize: '2.35rem', margin: '.3rem 0 .45rem' }}>Make support<br />easy to find.</h1><p className="muted" style={{ fontSize: '.81rem', lineHeight: 1.5, maxWidth: 520 }}>Manage the low-pressure invitations students can browse, save, and join across campus.</p></div><button className="primary-button" onClick={() => notify('New program form opened')} data-testid="button-create-program"><Plus size={15} /> Create program</button></div><div className="card-flat" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '.7rem', marginTop: '1.5rem' }}><Sparkles size={17} style={{ color: 'hsl(var(--primary))' }} /><span className="muted" style={{ fontSize: '.74rem', lineHeight: 1.45 }}>Keep program copy welcoming and specific. Avoid labels, promises of treatment, or language that pressures students to participate.</span></div><div className="section-heading"><h2>Library of offerings</h2><span className="mini-label">{programs.filter((program) => program.status === 'Published').length} published</span></div><div style={{ display: 'grid', gap: '.75rem' }}>{programs.map((program) => <div className="card" key={program.id} data-testid={`card-program-${program.id}`} style={{ padding: '1rem' }}><div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', gap: '1rem' }}><div><div className="eyebrow">{program.type}</div><h2 className="display" style={{ fontSize: '1.25rem', margin: '.35rem 0 .4rem' }}>{program.title}</h2><div className="muted" style={{ display: 'flex', flexWrap: 'wrap', gap: '.4rem 1rem', fontSize: '.72rem' }}><span><CalendarDays size={12} style={{ verticalAlign: 'middle', marginRight: '.25rem' }} />{program.schedule}</span><span><Eye size={12} style={{ verticalAlign: 'middle', marginRight: '.25rem' }} />{program.location}</span></div></div><span className="pill" style={{ color: program.status === 'Published' ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))', background: program.status === 'Published' ? 'hsl(var(--secondary))' : 'hsl(var(--muted))' }}>{program.status}</span></div><div style={{ display: 'flex', gap: '.5rem', marginTop: '1rem', paddingTop: '.8rem', borderTop: '1px solid hsl(var(--border))' }}><button className="secondary-button" onClick={() => notify(`${program.title} editor opened`)} data-testid={`button-edit-program-${program.id}`}><Settings2 size={14} /> Edit details</button><button className="ghost-button" onClick={() => toggle(program.id)} data-testid={`button-toggle-program-${program.id}`}>{program.status === 'Published' ? 'Move to draft' : 'Publish for students'} <ArrowRight size={14} /></button></div></div>)}</div><div className="section-heading"><h2>Resource safeguards</h2></div><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '.75rem' }}><div className="card-flat" style={{ padding: '1rem' }}><ShieldCheck size={18} style={{ color: 'hsl(var(--primary))' }} /><div style={{ fontWeight: 700, fontSize: '.8rem', marginTop: '.7rem' }}>Review before publish</div><p className="muted" style={{ fontSize: '.7rem', lineHeight: 1.5, margin: '.3rem 0 0' }}>Every resource has a named owner and a refresh date.</p></div><div className="card-flat" style={{ padding: '1rem' }}><UsersRound size={18} style={{ color: 'hsl(var(--primary))' }} /><div style={{ fontWeight: 700, fontSize: '.8rem', marginTop: '.7rem' }}>Student-led by design</div><p className="muted" style={{ fontSize: '.7rem', lineHeight: 1.5, margin: '.3rem 0 0' }}>Show what a student can expect before they sign up.</p></div></div></div></AdminShell>;
}

function AdminSecurity() {
  const { state, updateState, notify } = useApp();
  const [verifying, setVerifying] = useState(false);
  const verify = () => { setVerifying(true); setTimeout(() => { updateState({ integrityCheckedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }); setVerifying(false); notify('Integrity verified across the demo hash ledger'); }, 850); };
  const auditItems = [
    { icon: LockKeyhole, title: 'Protected record created', detail: 'Check-in trend · Student 7A2', time: '09:42', hash: 'a91c…7bf2' },
    { icon: CheckCircle2, title: 'Consent preference updated', detail: 'Tailored support · Student 4D6', time: '09:18', hash: '8c22…14de' },
    { icon: Fingerprint, title: 'Access reviewed', detail: 'Admin demo workspace · role verified', time: '08:56', hash: '7e0a…a321' },
    { icon: Network, title: 'Ledger checkpoint', detail: 'Demo tamper-evident hash ledger', time: '08:00', hash: '2b91…c8f0' },
  ];
  return <AdminShell><div className="page-wrap"><div className="animate-rise"><div className="eyebrow">Security & audit center</div><h1 className="display" style={{ fontSize: '2.35rem', margin: '.3rem 0 .45rem' }}>Trust you can<br />inspect.</h1><p className="muted" style={{ fontSize: '.81rem', lineHeight: 1.55, maxWidth: 560 }}>A transparent demo layer for protected records, consent events, and tamper-evident proofs. No live blockchain settlement is claimed here.</p></div><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '.75rem', marginTop: '1.6rem' }}><div className="card" style={{ padding: '1rem' }}><div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="eyebrow">Record protection</span><LockKeyhole size={16} style={{ color: 'hsl(var(--primary))' }} /></div><div className="stat-number" style={{ marginTop: '.7rem' }}>AES-256</div><div className="muted" style={{ fontSize: '.68rem', marginTop: '.3rem' }}>At-rest demo representation</div></div><div className="card" style={{ padding: '1rem' }}><div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="eyebrow">Consent events</span><CheckCircle2 size={16} style={{ color: 'hsl(var(--primary))' }} /></div><div className="stat-number" style={{ marginTop: '.7rem' }}>247</div><div className="muted" style={{ fontSize: '.68rem', marginTop: '.3rem' }}>Explicit actions this month</div></div><div className="card" style={{ padding: '1rem' }}><div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="eyebrow">Ledger state</span><Network size={16} style={{ color: 'hsl(var(--primary))' }} /></div><div className="stat-number" style={{ fontSize: '1.45rem', marginTop: '.78rem' }}>{state.integrityCheckedAt ? 'Verified' : 'Awaiting check'}</div><div className="muted" style={{ fontSize: '.68rem', marginTop: '.3rem' }}>{state.integrityCheckedAt ? `Last run ${state.integrityCheckedAt}` : 'Run a local integrity check'}</div></div></div><div className="admin-two-col" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.35fr) minmax(260px, .65fr)', gap: '1rem', marginTop: '1rem' }}><div className="card" style={{ padding: '1.2rem' }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '1rem' }}><div><div className="eyebrow">Recent protected activity</div><h2 className="display" style={{ fontSize: '1.35rem', margin: '.35rem 0 0' }}>A readable trail.</h2></div><button className="secondary-button" onClick={() => notify('Audit export prepared')} data-testid="button-export-audit"><ArrowRight size={14} /> Export log</button></div><div style={{ marginTop: '.9rem' }}>{auditItems.map((item, index) => { const Icon = item.icon; return <div className="audit-line" key={item.title}><Icon size={15} style={{ color: 'hsl(var(--primary))', marginTop: '.1rem' }} /><div><div style={{ fontSize: '.78rem', fontWeight: 700 }}>{item.title}</div><div className="muted" style={{ fontSize: '.68rem', marginTop: '.2rem' }}>{item.detail}</div><div className="hash" style={{ marginTop: '.35rem' }}>sha256:{item.hash} · proof {index + 1}</div></div><span className="muted" style={{ fontSize: '.67rem' }}>{item.time}</span></div>; })}</div></div><div className="card" style={{ padding: '1.2rem' }}><div className="eyebrow">Demo verification</div><h2 className="display" style={{ fontSize: '1.35rem', margin: '.35rem 0 .6rem' }}>Check the chain of custody.</h2><p className="muted" style={{ fontSize: '.73rem', lineHeight: 1.5 }}>Compare record proofs locally against the demo tamper-evident hash ledger.</p><div className="card-flat" style={{ padding: '.8rem', marginTop: '1rem', background: 'hsl(var(--muted) / .65)' }}><div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}><div className="status-dot" style={{ background: state.integrityCheckedAt ? 'hsl(var(--primary))' : 'hsl(var(--accent-foreground))' }} /><span style={{ fontSize: '.72rem', fontWeight: 700 }}>{state.integrityCheckedAt ? 'No changes detected' : 'Verification has not run'}</span></div><div className="hash" style={{ marginTop: '.55rem' }}>ledger:mci-demo-2024-10</div></div><button className="primary-button" style={{ width: '100%', marginTop: '1rem' }} disabled={verifying} onClick={verify} data-testid="button-verify-integrity">{verifying ? <><RefreshCw size={14} className="loading-dash" /> Comparing proofs…</> : <><ShieldCheck size={14} /> Run integrity verification</>}</button><div style={{ display: 'flex', alignItems: 'start', gap: '.45rem', marginTop: '.85rem' }}><Info size={14} className="muted" /><span className="muted" style={{ fontSize: '.66rem', lineHeight: 1.45 }}>This is a frontend demo ledger, not a live blockchain network.</span></div></div></div></div></AdminShell>;
}

function Router() {
  return <AppProvider><RoutedErrorBoundary><Switch><Route path="/" component={StudentHome} /><Route path="/check-in" component={CheckInPage} /><Route path="/wellness" component={WellnessPage} /><Route path="/community" component={CommunityLivePage} /><Route path="/support" component={SupportPage} /><Route path="/profile" component={CommunityProfilePage} /><Route path="/admin/login" component={AdminLogin} /><Route path="/admin" component={AdminOverview} /><Route path="/admin/cases" component={AdminCases} /><Route path="/admin/programs" component={AdminPrograms} /><Route path="/admin/security" component={AdminSecurity} /><Route component={NotFound} /></Switch></RoutedErrorBoundary></AppProvider>;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;