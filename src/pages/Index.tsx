import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { FileText, Upload, Share2, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/files");
      }
    });
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="max-w-3xl text-center space-y-8">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center shadow-lg">
            <FileText className="w-10 h-10 text-primary-foreground" />
          </div>
        </div>

        {/* Heading */}
        <div className="space-y-4">
          <h1 className="text-5xl font-bold tracking-tight">
            Welcome to Grutto Study
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Share and manage your study files with ease. Upload, organize, and collaborate
            with other students seamlessly.
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <div className="p-6 rounded-lg bg-card border shadow-sm">
            <Upload className="w-8 h-8 text-primary mb-3 mx-auto" />
            <h3 className="font-semibold mb-2">Easy Upload</h3>
            <p className="text-sm text-muted-foreground">
              Drag and drop your study files instantly
            </p>
          </div>
          <div className="p-6 rounded-lg bg-card border shadow-sm">
            <Share2 className="w-8 h-8 text-primary mb-3 mx-auto" />
            <h3 className="font-semibold mb-2">Share Effortlessly</h3>
            <p className="text-sm text-muted-foreground">
              Share files with classmates by username
            </p>
          </div>
          <div className="p-6 rounded-lg bg-card border shadow-sm">
            <Users className="w-8 h-8 text-primary mb-3 mx-auto" />
            <h3 className="font-semibold mb-2">Collaborate</h3>
            <p className="text-sm text-muted-foreground">
              Access files shared with you instantly
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="pt-8">
          <Button 
            size="lg" 
            className="px-8"
            onClick={() => navigate("/auth")}
          >
            Get Started
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
