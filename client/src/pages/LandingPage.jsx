import React, { useState } from "react";
import { v4 as uuid } from "uuid";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import Navbar from "../components/layout/Navbar";
import HeroSection from "../components/Landing/HeroSection";
import ActionCards from "../components/Landing/ActionCards";
import HowItWorks from "../components/Landing/HowItWorks";
import FeatureGrid from "../components/Landing/FeatureGrid";
import Footer from "../components/layout/Footer";

const LANGUAGES = ["JavaScript", "Python", "TypeScript", "Go", "Rust", "Java"];

function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Create Room State
  const [createRoomName, setCreateRoomName] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("JavaScript");

  // Join Room State
  const [joinInput, setJoinInput] = useState("");

  const handleCreateRoom = (e) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please sign in to create a room");
      navigate("/login?returnUrl=/");
      return;
    }

    const newRoomId = uuid();
    // Navigate to editor with isNewRoom flag so editor will emit CREATE_ROOM
    navigate(`/editor/${newRoomId}`, {
      state: { 
        isNewRoom: true,
        language: selectedLanguage.toLowerCase().replace("javascript", "nodejs"),
        projectName: createRoomName || "Untitled Project" 
      },
    });
    toast.success("Room instance initiated!");
  };

  const handleJoinRoom = (e) => {
    e.preventDefault();
    if (!joinInput.trim()) {
      toast.error("Please enter an invite link or Room ID.");
      return;
    }

    let targetUrl = `/editor/${joinInput}`;
    let isJoinRoute = false;

    // Try parsing as URL
    try {
      if (joinInput.includes("http://") || joinInput.includes("https://")) {
        const url = new URL(joinInput);
        if (url.pathname.includes("/join/") || url.pathname.includes("/editor/")) {
           targetUrl = url.pathname + url.search;
           isJoinRoute = url.pathname.includes("/join/");
        }
      }
    } catch {
      // Not a valid URL, fallback to treating as pure ID
    }

    if (!isJoinRoute) {
      // If it looks like a shareToken (48 hex characters), route it through the JoinHandler to redeem permissions
      const hexPattern = /^[0-9a-fA-F]{48}$/;
      if (hexPattern.test(joinInput)) {
        targetUrl = `/join/${joinInput}`;
      }
    }

    if (!user) {
      toast.error("Please sign in to join a room");
      navigate(`/login?returnUrl=${encodeURIComponent(targetUrl)}`);
      return;
    }

    navigate(targetUrl);
    toast.success("Connecting to room...");
  };

  return (
    <div className="landing-page">
      <Navbar variant="landing" />

      <main className="landing-main">
        <HeroSection />

        <ActionCards
          createRoomName={createRoomName}
          setCreateRoomName={setCreateRoomName}
          selectedLanguage={selectedLanguage}
          setSelectedLanguage={setSelectedLanguage}
          languages={LANGUAGES}
          onCreateRoom={handleCreateRoom}
          joinInput={joinInput}
          setJoinInput={setJoinInput}
          onJoinRoom={handleJoinRoom}
        />

        <HowItWorks />

        <FeatureGrid />
      </main>

      <Footer />
    </div>
  );
}

export default LandingPage;
