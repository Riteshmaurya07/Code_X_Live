import React from 'react';
import Button from '../ui/Button';
import Input from '../ui/Input';

const ActionCards = ({
  createRoomName,
  setCreateRoomName,
  selectedLanguage,
  setSelectedLanguage,
  languages,
  onCreateRoom,
  joinInput,
  setJoinInput,
  onJoinRoom
}) => {
  return (
    <section className="section-container grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 w-full">
      {/* Create Room Card */}
      <div className="landing-card create-card">
        <div className="card-badge">Start Fresh</div>
        <h2 className="text-2xl font-bold mb-6 text-[var(--text-primary)]">Create New Room</h2>
        <form onSubmit={onCreateRoom} className="flex flex-col gap-5">
          <Input 
            label="Room Name"
            placeholder="e.g. React Bugfix Session" 
            value={createRoomName}
            onChange={(e) => setCreateRoomName(e.target.value)}
          />
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-[var(--text-secondary)] ml-1">Language</label>
            <div className="flex flex-wrap gap-2">
              {languages.map((lang) => (
                <button
                  key={lang}
                  type="button"
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                    selectedLanguage === lang 
                      ? "bg-[var(--accent-soft)] border-[var(--accent)] text-[var(--accent)]" 
                      : "bg-[var(--bg-tertiary)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--text-primary)]"
                  }`}
                  onClick={() => setSelectedLanguage(lang)}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>
          <Button type="submit" fullWidth className="mt-4">Create Room</Button>
        </form>
      </div>

      {/* Join Room Card */}
      <div className="landing-card join-card">
        <div className="card-badge join-badge">Collaboration</div>
        <h2 className="text-2xl font-bold mb-6 text-[var(--text-primary)]">Join Existing Room</h2>
        <form onSubmit={onJoinRoom} className="flex flex-col gap-5 h-full">
          <Input 
            label="Invite Link or Room ID"
            placeholder="Paste invite link here" 
            value={joinInput}
            onChange={(e) => setJoinInput(e.target.value)}
          />
          <Button variant="success" type="submit" fullWidth className="mt-auto">Join Room</Button>
        </form>
      </div>
    </section>
  );
};

export default ActionCards;
