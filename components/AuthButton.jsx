"use client";

import React, { useState } from "react";
import { Button } from "./ui/button";
import { LogIn, LogOut } from "lucide-react";
import { AuthModal } from "./AuthModal";
import { signOut } from "@/app/actions";

const AuthButton = ({ user }) => {
  const [showAuthModal, setShowAuthModal] = useState(false);

  if (user) {
    return (
      <form action={signOut}>
        <Button variant="outline" size="sm" type="submit" className="h-11 rounded-xl border-gray-300 px-6 text-base font-semibold hover:bg-gray-100">
          <LogOut className="w-4 h-4" />
          Sign Out
        </Button>
      </form>
    );
  }
  return (
    <>
      <Button
      onClick={() => setShowAuthModal(true)}
        variant="default"
        size="sm"
        className="h-11 rounded-xl px-6 text-base font-semibold shadow-sm"
      >
        <LogIn className="w-4 h-4" />
        Sign In
      </Button>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </>
  );
};

export default AuthButton;
