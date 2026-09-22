import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Phone, ArrowLeft, ArrowRight, UserCircle, Shield, Loader2, Building2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { auth } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuth, type FranchiseOption, type RoleOption } from "@/hooks/useAuth";
import { useConfig } from "@/contexts/ConfigContext";
import { useOrgLogoUrl } from "@/hooks/useOrgLogoUrl";
import defaultLogo from "@/assets/logo.png";

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
  const orgLogoUrl = useOrgLogoUrl();
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

  return (
    <div className="flex min-h-screen flex-col gap-5 bg-muted/40 pb-6 lg:flex-row lg:gap-0 lg:pb-0">
      {/* Brand rail. Short and full-width on phones so the form stays above the
          fold; from `lg` it becomes the left half of a split. */}
      <aside className="relative isolate overflow-hidden bg-gradient-primary px-5 py-6 text-primary-foreground sm:px-8 lg:flex lg:w-1/2 lg:shrink-0 lg:flex-col lg:justify-center lg:px-14 lg:py-16 xl:px-20">
        {/* The dot field the hero already uses, at low opacity — texture in the
            theme's own colour rather than a second one to keep in sync. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:radial-gradient(#fff_1.5px,transparent_1.5px)] [background-size:20px_20px]"
        />
        <div className="relative flex min-w-0 items-center gap-3 lg:block">
          {/* The wordmark is dark, so it rides on a plate instead of going
              straight onto the gradient. */}
          <span className="inline-flex shrink-0 items-center rounded-2xl bg-white px-3.5 py-2 shadow-sm lg:px-4 lg:py-3">
            <img
              src={orgLogoUrl}
              alt={org.erpTitle}
              className="h-7 w-auto max-w-[8.5rem] object-contain sm:h-8 lg:h-9 lg:max-w-[11rem]"
              onError={(e) => { (e.target as HTMLImageElement).src = defaultLogo; }}
            />
          </span>
          <div className="min-w-0 lg:mt-8">
            <p className="truncate text-sm font-semibold sm:text-base lg:text-2xl">{org.erpTitle}</p>
            {tagline && (
              // Hidden on the narrowest phones: the band is a masthead there,
              // and the column left beside the mark fits about six words before
              // it has to cut the sentence off mid-thought.
              <p className="mt-1 hidden truncate text-xs text-primary-foreground/80 sm:block lg:mt-3 lg:max-w-sm lg:overflow-visible lg:whitespace-normal lg:text-base lg:leading-relaxed">
                {tagline}
              </p>
            )}
          </div>
        </div>
      </aside>

      <Card className="mx-auto my-auto w-[calc(100%-2rem)] max-w-md rounded-3xl border-border/60 shadow-elegant lg:w-[26rem] lg:max-w-none">
        <CardHeader className="space-y-1 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <CardTitle className="text-xl font-bold sm:text-2xl">
                {step === "role" ? "Select Login Type"
                  : step === "phone" ? "Login"
                  : step === "otp" ? "Verify OTP"
                  : step === "franchise-select" ? "Select Organisation"
                  : "Select Role"}
              </CardTitle>
              <CardDescription>
                {step === "role"
                  ? "Choose how you want to access the system"
                  : step === "phone"
                    ? `Logging in as ${role === "admin" ? "Admin" : "Beneficiary"}`
                    : step === "otp"
                      ? `We've sent a verification code to +91 ${phoneNumber}`
                      : step === "franchise-select"
                        ? "Select the organisation you want to log into"
                        : "Select the role you want to use for this session"
                }
              </CardDescription>
            </div>
            {step !== "role" && (
              <Button
                variant="ghost"
                size="sm"
                className="-mr-2 -mt-1 shrink-0 rounded-full text-muted-foreground"
                onClick={goBack}
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="ml-1 hidden sm:inline">Back</span>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-5 p-5 pt-0 sm:p-6 sm:pt-0">
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
                        "flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-all",
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

              <Button className="h-12 w-full rounded-xl bg-gradient-primary text-base shadow-glow" onClick={handleRoleSelect}>
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
                className="h-12 w-full rounded-xl bg-gradient-primary text-base shadow-glow"
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
                className="h-12 w-full rounded-xl bg-gradient-primary text-base shadow-glow"
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
              <Button className="h-12 w-full rounded-xl bg-gradient-primary text-base shadow-glow" onClick={handleFranchiseConfirm} disabled={loading || !selectedFranchiseId}>
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
              <Button className="h-12 w-full rounded-xl bg-gradient-primary text-base shadow-glow" onClick={handleRoleConfirm} disabled={loading || !selectedRole}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {loading ? 'Logging in…' : 'Login'}
              </Button>
            </>
          ) : null}

          <p className="pt-1 text-center text-xs text-muted-foreground">
            <Link to="/" className="font-medium underline-offset-4 hover:text-foreground hover:underline">
              Back to the website
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
