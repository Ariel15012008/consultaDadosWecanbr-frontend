// src/pages/ChatPage.tsx
"use client";

import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Toaster } from "sonner";

import ChatConsole from "@/components/ChatConsole";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { Button } from "@/components/ui/button";

export default function ChatPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen overflow-x-hidden">
      <Header />
      <Toaster richColors />

      <div className="fixed inset-0 bg-gradient-to-br from-indigo-500 via-purple-600 to-green-300 z-0" />

      <main className="relative z-10 flex flex-col flex-grow items-center pt-32 px-4 pb-10">
        <div className="flex justify-start items-start w-full">
        <Button
          variant="default"
          onClick={() => navigate("/")}
          className="mb-4 text-white hover:text-gray-300"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        </div>

        <ChatConsole />
      </main>

      <Footer />
    </div>
  );
}
