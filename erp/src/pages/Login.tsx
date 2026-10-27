import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import {
  Phone, ArrowLeft, ArrowRight, UserCircle, Shield, Loader2, Building2, Check, Globe, Lock, Mail, ShieldCheck,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { auth } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuth, type FranchiseOption, type RoleOption } from "@/hooks/useAuth";
import { useConfig } from "@/contexts/ConfigContext";
import { useSiteData } from "@/hooks/useSiteData";
import { SiteTheme } from "@/components/site/SiteTheme";
import { BrandMark } from "@/components/site/BrandMark";
import { resolveIcon } from "@/lib/siteIcons";
import { stripHtml } from "@/lib/richText";

/** 1000 → "1K", 22000 → "22K", 1500000 → "1.5M". */
const compactNumber = (n: number) =>
  new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n || 0);

/** Route to navigate to after a successful admin login, based on role. */
function getAdminRoute(role: string, fallback: string): string {
  if (role === 'area_president') return '/area-president-dashboard';
  if (role === 'super_admin' || role === 'state_admin') return '/dashboard';
  return fallback;
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, selectRole } = useAuth();
  const { org } = useConfig();
  const { data: siteData, isLoading: siteLoading } = useSiteData();
  // Hold the page back briefly while the site palette loads, so the default
  // ERP colours don't flash first. Never longer than ~1s if the API is slow.
  const [waited, setWaited] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => setWaited(true), 1000);
    return () => window.clearTimeout(id);
  }, []);
  const ready = !siteLoading || waited;
  // Brand panel slideshow position.
  const [slide, setSlide] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setSlide((n) => n + 1), 6000);
    return () => window.clearInterval(id);
  }, []);
  const [step, setStep] = useState<"role" | "phone" | "otp" | "franchise-select" | "role-select">("role");
  const [role, setRole] = useState<"beneficiary" | "admin">("admin");
  const [phoneNumber, setPhoneNumber] = useState("9876543210");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [developmentOTP, setDevelopmentOTP] = useState<string | null>(null);

  // Selection state for multi-franchise / multi-role flow
  const [selectionToken, setSelectionToken] = useState<string>("");
  const [franchiseOptions, setFranchiseOptions] = useState<FranchiseOption[]>([]);
  const [roleOptions, setRoleOptions] = useState<RoleOption[]>([]);
  const [selectedFranchiseId, setSelectedFranchiseId] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<string>("");

  // Get the return URL from location state
  const from = location.state?.from?.pathname || "/dashboard";

  /** The line of brand copy under the mark, if this franchise has one. */
  const tagline = org.tagline || org.erpSubtitle || "";

  /** One step back, following the order the steps were entered in. */
  const goBack = () => {
    if (step === "otp") setStep("phone");
    else if (step === "franchise-select" || step === "role-select") setStep("otp");
    else setStep("role");
  };

  const handleRoleSelect = () => {
    setStep("phone");
  };

  const handleSendOTP = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid 10-digit mobile number",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      let response;
      
      // Use different API endpoints based on role
      if (role === "beneficiary") {
        // Use beneficiary API which auto-creates account
        const beneficiaryApi = await import("@/services/beneficiaryApi");
        response = await beneficiaryApi.beneficiaryApi.sendOTP(phoneNumber);
        
        // Store static OTP if provided
        if (response.staticOTP || response.developmentOTP) {
          const staticOTP = response.staticOTP || response.developmentOTP;
          setDevelopmentOTP(staticOTP);
          setOtp(staticOTP); // Auto-fill for convenience
        }
      } else {
        // Use admin auth API
        response = await auth.requestOTP(phoneNumber, 'login');
        
        // Store static OTP if provided
        if (response.data?.staticOTP || response.data?.developmentOTP) {
          const staticOTP = response.data?.staticOTP || response.data?.developmentOTP;
          setDevelopmentOTP(staticOTP);
          setOtp(staticOTP); // Auto-fill for convenience
        }
      }
      
      toast({
        title: "OTP Sent",
        description: `Verification code sent to +91 ${phoneNumber}`,
      });
      setStep("otp");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send OTP",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      toast({
        title: "Invalid OTP",
        description: "Please enter the 6-digit verification code",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      if (role === "beneficiary") {
        // Use beneficiary API for verification
        const beneficiaryApi = await import("@/services/beneficiaryApi");
        const response = await beneficiaryApi.beneficiaryApi.verifyOTP(phoneNumber, otp);
        
        console.log('✅ Login successful');
        console.log('- Waiting 100ms for localStorage to persist...');
        
        // Small delay to ensure localStorage is written
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Verify token was saved
        const savedToken = localStorage.getItem('beneficiary_token');
        console.log('- Token saved?', !!savedToken);
        console.log('- Token matches?', savedToken === response.token);
        
        // Test the token immediately by calling getProfile
        try {
          console.log('- Testing token with getProfile...');
          const profileTest = await beneficiaryApi.beneficiaryApi.getProfile();
          console.log('✅ Token test successful! Profile:', profileTest);
        } catch (testError: any) {
          console.error('❌ Token test failed:', testError);
          toast({
            title: "Token Verification Failed",
            description: testError.message,
            variant: "destructive",
          });
          return;
        }
        
        toast({
          title: "Login Successful",
          description: `Welcome, ${response.user.name}!`,
        });
        
        // Check if profile is complete (isVerified flag)
        setTimeout(() => {
          if (!response.user.isVerified) {
            // First-time user - redirect to profile completion
            navigate("/beneficiary/profile-completion", { replace: true });
          } else {
            // Returning user - go to dashboard
            navigate("/beneficiary/dashboard", { replace: true });
          }
        }, 500);
      } else {
        // Use admin auth for verification
        const result = await login(phoneNumber, otp);

        // ── Multi-franchise selection ──────────────────────────────────────
        if ('requiresFranchiseSelection' in result && result.requiresFranchiseSelection) {
          setFranchiseOptions(result.franchises);
          setSelectionToken(result.selectionToken);
          setSelectedFranchiseId(result.franchises[0]?.id ?? '');
          setStep('franchise-select');
          toast({ title: 'Select Organisation', description: result.message });
          return;
        }

        // ── Multi-role selection ───────────────────────────────────────────
        if ('requiresRoleSelection' in result && result.requiresRoleSelection) {
          setRoleOptions(result.roles);
          setSelectionToken(result.selectionToken);
          setSelectedFranchiseId(result.franchiseId);
          setSelectedRole(result.roles[0]?.role ?? '');
          setStep('role-select');
          toast({ title: 'Select Role', description: result.message });
          return;
        }

        // ── Direct login ───────────────────────────────────────────────────
        await _finaliseAdminLogin();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to verify OTP",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  /** Reads localStorage after a direct/select-role login and navigates. */
  const _finaliseAdminLogin = async () => {
    await new Promise(resolve => setTimeout(resolve, 150));

    const savedToken = localStorage.getItem('token');
    const savedUser  = localStorage.getItem('user');

    if (!savedToken || !savedUser) {
      toast({ title: "Login Error", description: "Failed to save authentication data. Please try again.", variant: "destructive" });
      return;
    }

    toast({ title: "Login Successful", description: "Welcome back!" });

    const parsedUser = JSON.parse(savedUser);
    if (parsedUser?.isSuperAdmin) {
      navigate('/global-admin', { replace: true });
    } else {
      navigate(getAdminRoute(parsedUser?.role ?? '', from), { replace: true });
    }
  };

  const handleFranchiseConfirm = async () => {
    if (!selectedFranchiseId) return;
    setLoading(true);
    try {
      // Call select-role without a role — the backend will either:
      //   a) return requiresRoleSelection if the user has multiple roles in this franchise
      //   b) complete login directly if the user has exactly one role
      const apiUrl = import.meta.env.VITE_API_URL!;
      const res = await fetch(`${apiUrl}/auth/select-role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectionToken, franchiseId: selectedFranchiseId }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast({ title: 'Error', description: data.message || 'Failed to select organisation', variant: 'destructive' });
        return;
      }

      if (data.data?.requiresRoleSelection) {
        setRoleOptions(data.data.roles);
        setSelectedRole(data.data.roles[0]?.role ?? '');
        setStep('role-select');
        toast({ title: 'Select Role', description: data.data.message });
        return;
      }

      // Single role — server returned the full JWT immediately
      if (data.success && data.data?.user && data.data?.tokens) {
        localStorage.setItem('token', data.data.tokens.accessToken);
        localStorage.setItem('user', JSON.stringify(data.data.user));
        if (data.data.tokens.refreshToken) localStorage.setItem('refreshToken', data.data.tokens.refreshToken);
        await _finaliseAdminLogin();
        return;
      }

      toast({ title: 'Error', description: data.message || 'Failed to select organisation', variant: 'destructive' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to select organisation', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleRoleConfirm = async () => {
    if (!selectedRole || !selectedFranchiseId) return;
    setLoading(true);
    try {
      await selectRole(selectionToken, selectedFranchiseId, selectedRole);
      await _finaliseAdminLogin();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to select role', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setLoading(true);
    try {
      let response;
      
      // Use different API endpoints based on role
      if (role === "beneficiary") {
        // Use beneficiary API
        const beneficiaryApi = await import("@/services/beneficiaryApi");
        response = await beneficiaryApi.beneficiaryApi.resendOTP(phoneNumber);
        
        // Store static OTP if provided
        if (response.staticOTP || response.developmentOTP) {
          const staticOTP = response.staticOTP || response.developmentOTP;
          setDevelopmentOTP(staticOTP);
          setOtp(staticOTP); // Auto-fill for convenience
        }
      } else {
        // Use admin auth API
        response = await auth.requestOTP(phoneNumber, 'login');
        
        // Store static OTP if provided
        if (response.data?.staticOTP || response.data?.developmentOTP) {
          const staticOTP = response.data?.staticOTP || response.data?.developmentOTP;
          setDevelopmentOTP(staticOTP);
          setOtp(staticOTP); // Auto-fill for convenience
        }
      }
      
      toast({
        title: "OTP Resent",
        description: `New verification code sent to +91 ${phoneNumber}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to resend OTP",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // The website's own look: its palette (SiteTheme), fonts (.site-font),
  // banner photography, impact counters and contact details — so signing in
  // feels like part of the site rather than a separate product.
  const site = siteData?.settings || {};
  const slides = (siteData?.banners || []).map((b) => b.imageUrl).filter(Boolean) as string[];
  if (!slides.length && site.aboutUs?.imageUrl) slides.push(site.aboutUs.imageUrl);
  const headline = site.hero?.title?.trim() || org.displayName || org.erpTitle;
  const intro = site.aboutUs?.description?.trim() ? stripHtml(site.aboutUs.description) : tagline;
  const stats = (site.counts || []).slice(0, 3);
  const contact = site.contactDetails || {};
  const stepIndex = step === "role" ? 0 : step === "phone" ? 1 : 2;

  return (
    <div className={cn("site-font flex min-h-screen flex-col bg-background transition-opacity duration-300 lg:flex-row", ready ? "opacity-100" : "opacity-0")}>
      <SiteTheme primary={site.appearance?.primaryColor} gradient={site.appearance?.gradientColor} />

      {/* ── Brand panel: banner photography under the brand gradient ── */}
      <aside className="relative isolate flex min-h-[15rem] flex-col overflow-hidden bg-[image:var(--gradient-brand)] text-white sm:min-h-[18rem] lg:min-h-screen lg:w-[52%] lg:shrink-0 xl:w-[56%]">
        {slides.map((src, i) => (
          <img
            key={src}
            src={src}
            alt=""
            aria-hidden
            className={cn(
              "absolute inset-0 -z-20 h-full w-full object-cover transition-opacity duration-[1500ms] ease-out",
              i === slide % slides.length ? "opacity-100" : "opacity-0",
            )}
          />
        ))}
        {/* Readability: dark at the foot where the copy sits, brand-tinted on top. */}
        <span aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-black/85 via-black/45 to-black/20" />
        <span aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-black/60 via-black/25 to-transparent" />
        <span aria-hidden className="absolute inset-0 -z-10 bg-[image:var(--gradient-brand)] opacity-40 mix-blend-multiply" />

        <div className="flex items-center justify-between gap-3 p-5 sm:p-8 lg:p-10">
          <Link to="/" className="inline-flex items-center rounded-2xl bg-white/95 px-3.5 py-2 shadow-lg backdrop-blur transition hover:bg-white">
            <BrandMark className="h-8 w-auto max-w-[9rem] object-contain sm:h-9 lg:h-11 lg:max-w-[12rem]" />
          </Link>
          <Link to="/" className="hidden items-center gap-1.5 rounded-full border border-white/30 bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur transition hover:bg-white/20 sm:inline-flex">
            <Globe className="h-4 w-4" /> Visit website
          </Link>
        </div>

        <div className="mt-auto space-y-4 p-5 pt-0 sm:p-8 sm:pt-0 lg:space-y-6 lg:p-12 lg:pt-0 xl:p-16 xl:pt-0">
          <span className="inline-block rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] backdrop-blur">
            Welcome back
          </span>
          <h1 className="max-w-xl text-3xl text-white sm:text-4xl lg:text-5xl xl:text-6xl">{headline}</h1>
          {intro && (
            <p className="hidden max-w-lg text-base leading-relaxed text-white/85 sm:line-clamp-3 lg:text-lg">{intro}</p>
          )}

          {stats.length > 0 && (
            <div className="hidden gap-3 pt-2 md:grid md:grid-cols-3 lg:max-w-xl">
              {stats.map((c) => {
                const Icon = resolveIcon(c.icon);
                return (
                  <div key={c._id || c.title} className="rounded-2xl border border-white/15 bg-white/10 p-3.5 backdrop-blur-md">
                    <Icon className="mb-2 h-5 w-5 text-[hsl(var(--brand-lime))]" />
                    <p className="text-2xl font-semibold leading-none">{compactNumber(c.count)}+</p>
                    <p className="mt-1 text-xs leading-snug text-white/75">{c.title}</p>
                  </div>
                );
              })}
            </div>
          )}

          {slides.length > 1 && (
            <div className="flex gap-1.5 pt-1" aria-hidden>
              {slides.map((src, i) => (
                <span key={src} className={cn("h-1.5 rounded-full bg-white/40 transition-all duration-500", i === slide % slides.length ? "w-8 bg-white" : "w-1.5")} />
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* ── Sign-in column ── */}
      <main className="relative flex flex-1 flex-col overflow-hidden">
        {/* Soft brand texture behind the card. */}
        <span aria-hidden className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <span aria-hidden className="pointer-events-none absolute -bottom-40 -left-24 h-96 w-96 rounded-full bg-[hsl(var(--brand-orange)/0.08)] blur-3xl" />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:radial-gradient(hsl(var(--primary)/0.18)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]"
        />

        <div className="relative flex flex-1 items-center justify-center px-4 py-8 sm:px-8 lg:py-12">
          <div className="w-full max-w-[28rem]">
            <div className="mb-6 space-y-3 text-center lg:text-left">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
                <Lock className="h-3 w-3" /> Secure sign in
              </span>
              <h2 className="text-3xl text-foreground sm:text-4xl">
                {step === "role" ? "Sign in to continue"
                  : step === "phone" ? <>Enter your <span className="text-primary">mobile</span></>
                  : step === "otp" ? <>Verify it's <span className="text-primary">you</span></>
                  : step === "franchise-select" ? "Choose organisation"
                  : "Choose your role"}
              </h2>
              <p className="text-sm text-muted-foreground sm:text-base">
                {step === "role"
                  ? `Access ${org.displayName || org.erpTitle} — apply for support or manage the programmes.`
                  : step === "phone"
                    ? `Signing in as ${role === "admin" ? "an administrator" : "a beneficiary"}. We'll text you a one-time code.`
                    : step === "otp"
                      ? `Enter the 6-digit code sent to +91 ${phoneNumber}`
                      : step === "franchise-select"
                        ? "Select the organisation you want to log into"
                        : "Select the role you want to use for this session"}
              </p>
            </div>

            {/* Progress: login type → mobile → verify */}
            <div className="mb-5 flex items-center gap-2" aria-hidden>
              {["Login type", "Mobile", "Verify"].map((label, i) => (
                <div key={label} className="flex flex-1 items-center gap-2">
                  <span className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold transition-colors",
                    i < stepIndex ? "bg-primary text-primary-foreground" : i === stepIndex ? "bg-primary/15 text-primary ring-2 ring-primary/40" : "bg-muted text-muted-foreground",
                  )}>
                    {i < stepIndex ? <Check className="h-3.5 w-3.5" /> : i + 1}
                  </span>
                  <span className={cn("hidden text-xs font-medium sm:inline", i <= stepIndex ? "text-foreground" : "text-muted-foreground")}>{label}</span>
                  {i < 2 && <span className={cn("h-px flex-1", i < stepIndex ? "bg-primary/50" : "bg-border")} />}
                </div>
              ))}
            </div>

      <Card className="rounded-3xl border-border/60 bg-card/95 shadow-[0_24px_60px_-24px_hsl(var(--primary)/0.35)] backdrop-blur">
        <CardHeader className="p-0">
          {step !== "role" && (
            <div className="flex justify-end px-4 pt-3">
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0 rounded-full text-muted-foreground"
                onClick={goBack}
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="ml-1">Back</span>
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className={cn("space-y-5 p-5 sm:p-6", step !== "role" && "pt-1 sm:pt-1")}>
          {step === "role" ? (
            <>
              {/* One label per option, so the whole card is the hit target
                  rather than the radio dot on its own. */}
              <RadioGroup
                value={role}
                onValueChange={(v) => setRole(v as "beneficiary" | "admin")}
                className="gap-3"
              >
                {([
                  { value: "beneficiary", Icon: UserCircle, title: "Beneficiary Login", body: "Apply for schemes and track applications" },
                  { value: "admin", Icon: Shield, title: "Admin Login", body: "Manage applications and system" },
                ] as const).map(({ value, Icon, title, body }) => {
                  const active = role === value;
                  return (
                    <Label
                      key={value}
                      htmlFor={value}
                      className={cn(
                        "flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-all duration-200",
                        "hover:border-primary/40 hover:bg-muted/50",
                        active ? "border-primary bg-primary/5 shadow-sm" : "border-border",
                      )}
                    >
                      <RadioGroupItem value={value} id={value} className="mt-1" />
                      <span
                        className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors",
                          active ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary",
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold sm:text-base">{title}</span>
                        <span className="mt-0.5 block text-xs leading-snug text-muted-foreground sm:text-sm">{body}</span>
                      </span>
                    </Label>
                  );
                })}
              </RadioGroup>

              <Button className="h-12 w-full rounded-full text-base shadow-[0_10px_24px_-10px_hsl(var(--primary)/0.7)]" onClick={handleRoleSelect}>
                Continue
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </>
          ) : step === "phone" ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="phone">Mobile Number</Label>
                <div className="flex gap-2">
                  <span className="flex h-12 shrink-0 items-center rounded-xl border border-input bg-muted px-3 text-sm font-semibold">
                    +91
                  </span>
                  <Input
                    id="phone"
                    type="tel"
                    // Numeric keypad and the saved-number autofill on a phone,
                    // which is most of what "mobile first" means for a login.
                    inputMode="numeric"
                    autoComplete="tel"
                    placeholder="10-digit mobile number"
                    className="h-12 rounded-xl"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    maxLength={10}
                  />
                </div>
              </div>
              <Button
                className="h-12 w-full rounded-full text-base shadow-[0_10px_24px_-10px_hsl(var(--primary)/0.7)]"
                onClick={handleSendOTP}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Phone className="mr-2 h-4 w-4" />
                )}
                {loading ? "Sending..." : "Send OTP"}
              </Button>
            </>
          ) : step === "otp" ? (
            <>
              {/* Token colours rather than the fixed green-50/green-200 this
                  used, so the panel stays legible if the theme is dark. */}
              {developmentOTP && (
                <div className="rounded-xl border border-success/30 bg-success/10 p-3 text-center">
                  <p className="text-sm font-medium">
                    Static OTP: <span className="font-mono text-lg">{developmentOTP}</span>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    This OTP is always 123456 for all logins
                  </p>
                </div>
              )}
              <div className="space-y-3">
                <Label htmlFor="otp" className="block text-center">Enter the 6-digit code</Label>
                <div className="flex justify-center">
                  {/* autoComplete lets a phone offer the code straight from the
                      SMS, instead of making the visitor switch apps to read it. */}
                  <InputOTP maxLength={6} value={otp} onChange={setOtp} autoComplete="one-time-code">
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
              </div>

              <p className="text-center text-sm text-muted-foreground">
                Didn't receive the code?{" "}
                <Button
                  variant="link"
                  className="h-auto p-0 font-semibold"
                  onClick={handleResendOTP}
                >
                  Resend OTP
                </Button>
              </p>

              <Button
                className="h-12 w-full rounded-full text-base shadow-[0_10px_24px_-10px_hsl(var(--primary)/0.7)]"
                onClick={handleVerifyOTP}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {loading ? "Verifying..." : "Verify & Login"}
              </Button>
            </>
          ) : step === "franchise-select" ? (
            <>
              <p className="text-sm text-muted-foreground">You have access to multiple organisations. Choose one to continue.</p>
              <RadioGroup value={selectedFranchiseId} onValueChange={setSelectedFranchiseId} className="gap-2.5">
                {franchiseOptions.map((f) => {
                  const active = selectedFranchiseId === f.id;
                  return (
                    <Label
                      key={f.id}
                      htmlFor={`franchise-${f.id}`}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-2xl border p-3.5 transition-all",
                        "hover:border-primary/40 hover:bg-muted/50",
                        active ? "border-primary bg-primary/5 shadow-sm" : "border-border",
                      )}
                    >
                      <RadioGroupItem value={f.id} id={`franchise-${f.id}`} />
                      <span
                        className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors",
                          active ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary",
                        )}
                      >
                        <Building2 className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1 truncate font-medium">{f.displayName}</span>
                    </Label>
                  );
                })}
              </RadioGroup>
              <Button className="h-12 w-full rounded-full text-base shadow-[0_10px_24px_-10px_hsl(var(--primary)/0.7)]" onClick={handleFranchiseConfirm} disabled={loading || !selectedFranchiseId}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {loading ? 'Please wait…' : 'Continue'}
              </Button>
            </>
          ) : step === "role-select" ? (
            <>
              <p className="text-sm text-muted-foreground">You hold multiple roles in this organisation. Choose the role to use for this session.</p>
              <RadioGroup value={selectedRole} onValueChange={setSelectedRole} className="gap-2.5">
                {roleOptions.map((r) => {
                  const active = selectedRole === r.role;
                  return (
                    <Label
                      key={r.role}
                      htmlFor={`role-${r.role}`}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-2xl border p-3.5 transition-all",
                        "hover:border-primary/40 hover:bg-muted/50",
                        active ? "border-primary bg-primary/5 shadow-sm" : "border-border",
                      )}
                    >
                      <RadioGroupItem value={r.role} id={`role-${r.role}`} />
                      <span
                        className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors",
                          active ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary",
                        )}
                      >
                        <Shield className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1 truncate font-medium">{r.displayName}</span>
                    </Label>
                  );
                })}
              </RadioGroup>
              <Button className="h-12 w-full rounded-full text-base shadow-[0_10px_24px_-10px_hsl(var(--primary)/0.7)]" onClick={handleRoleConfirm} disabled={loading || !selectedRole}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {loading ? 'Logging in…' : 'Login'}
              </Button>
            </>
          ) : null}

          <p className="flex items-center justify-center gap-1.5 pt-1 text-center text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            Protected with one-time passwords — we never ask for a password.
          </p>
        </CardContent>
      </Card>

            <div className="mt-6 space-y-3 text-center text-xs text-muted-foreground">
              {(contact.phone || contact.email) && (
                <p className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
                  <span>Need help?</span>
                  {contact.phone && (
                    <a href={`tel:${contact.phone.replace(/[^+\d]/g, "")}`} className="inline-flex items-center gap-1 font-medium text-foreground/80 hover:text-primary">
                      <Phone className="h-3 w-3" />{contact.phone}
                    </a>
                  )}
                  {contact.email && (
                    <a href={`mailto:${contact.email}`} className="inline-flex items-center gap-1 font-medium text-foreground/80 hover:text-primary">
                      <Mail className="h-3 w-3" />{contact.email}
                    </a>
                  )}
                </p>
              )}
              <p className="flex items-center justify-center gap-3">
                <Link to="/" className="inline-flex items-center gap-1 font-medium hover:text-primary">
                  <ArrowLeft className="h-3 w-3" /> Back to the website
                </Link>
                <span aria-hidden>·</span>
                <Link to="/privacy-policy" className="font-medium hover:text-primary">Privacy policy</Link>
              </p>
            </div>
          </div>
        </div>

        <p className="relative pb-5 text-center text-[11px] text-muted-foreground/80">
          © {new Date().getFullYear()} {org.displayName || org.erpTitle}
        </p>
      </main>
    </div>
  );
}
