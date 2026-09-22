import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { ArrowRight, Calendar, IndianRupee, Users, Loader2, AlertCircle, LogIn } from "lucide-react";
import { SiteShell, PageHero } from "@/components/site/SiteShell";
import { schemePath } from "@/lib/siteSchemes";
import { beneficiaryApi } from "@/services/beneficiaryApi";

interface Scheme {
  _id: string;
  name: string;
  description: string;
  category: string;
  benefits: {
    type: string;
    amount?: number;
    minAmount?: number;
    maxAmount?: number;
  };
  applicationSettings: {
    endDate: string;
  };
  statistics?: {
    totalBeneficiaries?: number;
  };
}

export default function PublicSchemes() {
  const navigate = useNavigate();
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isLoggedIn = localStorage.getItem("beneficiary_token");

  useEffect(() => {
    if (isLoggedIn) {
      loadSchemes();
    } else {
      setLoading(false);
    }
  }, [isLoggedIn]);

  const loadSchemes = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await beneficiaryApi.getAvailableSchemes();
      if (response.schemes && Array.isArray(response.schemes)) {
        setSchemes(response.schemes);
      } else {
        setSchemes([]);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load schemes");
      setSchemes([]);
    } finally {
      setLoading(false);
    }
  };

  // The card opens the scheme's public detail page; applying is its own
  // button, so a visitor can read the eligibility rules before being asked
  // to sign in.
  const handleSchemeClick = (scheme: Scheme) => {
    navigate(schemePath(scheme));
  };

  const handleApply = (schemeId: string) => {
    if (!isLoggedIn) {
      navigate("/beneficiary-login");
    } else {
      navigate(`/beneficiary/apply/${schemeId}`);
    }
  };

  // Reads `benefits`, the field the Scheme model actually has. This said
  // `beneficiaries` — which exists on neither the model nor the interface
  // above — so every card fell through to "Amount varies".
  const formatAmount = (scheme: Scheme) => {
    if (scheme.benefits?.minAmount && scheme.benefits?.maxAmount) {
      return `₹${scheme.benefits.minAmount.toLocaleString()} - ₹${scheme.benefits.maxAmount.toLocaleString()}`;
    }
    if (scheme.benefits?.amount) {
      return `₹${scheme.benefits.amount.toLocaleString()}`;
    }
    return "Amount varies";
  };

  return (
    // Shares the public site's shell rather than its own header/hero/footer:
    // this page is the destination of the home page's "View all schemes" CTA,
    // and a bespoke bar here dropped visitors out of the mobile app shell —
    // no drawer, no bottom tab bar — the moment they followed it.
    <SiteShell>
      <PageHero
        title="Available Schemes"
        subtitle="Browse and apply for various assistance programs designed to support our community"
      />

      {/* Schemes Grid */}
      <section className="py-10 md:py-12">
        <div className="container mx-auto px-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin mr-2" />
              <span className="text-muted-foreground">Loading schemes...</span>
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : !isLoggedIn ? (
            <EmptyState
              icon={LogIn}
              title="Login Required"
              description="Please log in to view available schemes and apply for assistance programs."
              action={{
                label: "Go to Login",
                onClick: () => navigate("/beneficiary-login"),
              }}
            />
          ) : schemes.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No Schemes Available"
              description="There are currently no active schemes available. Please check back later."
            />
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {schemes.map((scheme) => (
                <Card 
                  key={scheme._id} 
                  className="hover:shadow-elegant transition-all duration-300 hover:-translate-y-1 cursor-pointer"
                  onClick={() => handleSchemeClick(scheme)}
                >
                  <CardHeader>
                    <div className="flex justify-between items-start mb-2">
                      <CardTitle className="text-xl">{scheme.name}</CardTitle>
                      <Badge variant="default" className="bg-green-600">
                        Active
                      </Badge>
                    </div>
                    <CardDescription className="line-clamp-2">
                      {scheme.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <IndianRupee className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold">{formatAmount(scheme)}</span>
                    </div>
                    {scheme.applicationSettings?.endDate && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>Deadline: {new Date(scheme.applicationSettings.endDate).toLocaleDateString()}</span>
                      </div>
                    )}
                    {scheme.statistics?.totalBeneficiaries && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>{scheme.statistics.totalBeneficiaries} Beneficiaries</span>
                      </div>
                    )}
                    <Button
                      className="w-full mt-4"
                      variant="default"
                      onClick={(e) => { e.stopPropagation(); handleApply(scheme._id); }}
                    >
                      Apply Now
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>
    </SiteShell>
  );
}
