import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { LoaderCircle, Camera, MessageSquare } from "lucide-react";
import {
  getUserProfile, followUser, unfollowUser,
  getActivityDashboard, uploadAvatar,
} from "../services/userService";
import Navbar from "../components/layout/Navbar";
import Button from "../components/ui/Button";
import UserListModal from "../components/profile/UserListModal";
import ActivityDashboard from "../components/profile/ActivityDashboard";
import { useAuth } from "../hooks/useAuth";
import { useDM } from "../hooks/useDM";
import ProjectCard from "../components/Dashboard/ProjectCard";
import toast from "react-hot-toast";

function PublicProfile() {
  const { username } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user: currentUser } = useAuth();
  const { openDM } = useDM();
  const fileInputRef = useRef(null);
  const [profileData, setProfileData] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowingPending, setIsFollowingPending] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const isOwnProfile = currentUser?.username === username;
  const listType = location.pathname.endsWith("/followers") ? 'followers' : 
                   location.pathname.endsWith("/following") ? 'following' : null;

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const [profData, dashData] = await Promise.all([
          getUserProfile(username),
          getActivityDashboard(username)
        ]);
        setProfileData(profData);
        setDashboardData(dashData);
        setAvatarUrl(profData?.profile?.avatar || '');
        setIsFollowing(!!profData?.profile?.isFollowing);
      } catch (err) {
        toast.error(err.response?.data?.error || "Failed to load profile");
        navigate("/dashboard");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [username, navigate, currentUser]);

  const handleFollowToggle = async () => {
    if (!currentUser) return navigate("/login");
    setIsFollowingPending(true);
    try {
      if (isFollowing) {
        await unfollowUser(profileData.profile.id);
        setIsFollowing(false);
        setProfileData(prev => ({
          ...prev, 
          profile: { ...prev.profile, followersCount: Math.max(0, (prev.profile.followersCount || 0) - 1) }
        }));
      } else {
        await followUser(profileData.profile.id);
        setIsFollowing(true);
        setProfileData(prev => ({
          ...prev, 
          profile: { ...prev.profile, followersCount: (prev.profile.followersCount || 0) + 1 }
        }));
      }
    } catch {
      toast.error("Failed to update follow status");
    } finally {
      setIsFollowingPending(false);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Preview immediately
    const previewUrl = URL.createObjectURL(file);
    setAvatarUrl(previewUrl);
    setIsUploadingAvatar(true);
    try {
      const result = await uploadAvatar(file);
      setAvatarUrl(result.avatar);
      toast.success('Profile picture updated!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed');
      setAvatarUrl(profileData?.profile?.avatar || '');
    } finally {
      setIsUploadingAvatar(false);
      // reset input so same file can be re-selected
      e.target.value = '';
    }
  };
  return (
    <div className="dashboard-page profile-page">
      <Navbar variant="dashboard" />
      
      <div className="dashboard-content container-padding">
        {loading ? (
          <div className="loading-state">Loading profile...</div>
        ) : profileData ? (
          <>
            <div className="profile-header">
              <div
                className={`profile-avatar ${isOwnProfile ? 'profile-avatar--editable' : ''}`}
                onClick={() => isOwnProfile && fileInputRef.current?.click()}
                title={isOwnProfile ? 'Click to change photo' : ''}
              >
                {avatarUrl
                  ? <img src={avatarUrl} alt="avatar" className="h-full w-full rounded-full object-cover" />
                  : profileData.profile.username.charAt(0).toUpperCase()
                }
                {isOwnProfile && (
                  <div className="profile-avatar-overlay">
                    {isUploadingAvatar ? <LoaderCircle size={24} className="animate-spin" /> : <Camera size={24} />}
                  </div>
                )}
              </div>
              {/* Hidden file input */}
              {isOwnProfile && (
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              )}
              <div className="profile-info flex-1">
                <div className="flex flex-col gap-1">
                  <h1 className="profile-name">
                    {profileData.profile.fullName || profileData.profile.username}
                  </h1>
                  {profileData.profile.fullName && (
                    <p className="profile-meta text-[var(--text-muted)] text-sm">@{profileData.profile.username}</p>
                  )}
                </div>

                <div className="flex flex-wrap gap-x-6 gap-y-2 mt-4 text-sm text-[var(--text-secondary)]">
                  {profileData.profile.firstName && (
                    <div className="flex items-center gap-2">
                      <span className="text-[var(--accent)] text-xs font-semibold uppercase tracking-wider">First Name:</span>
                      <span>{profileData.profile.firstName}</span>
                    </div>
                  )}
                  {profileData.profile.lastName && (
                    <div className="flex items-center gap-2">
                      <span className="text-[var(--accent)] text-xs font-semibold uppercase tracking-wider">Last Name:</span>
                      <span>{profileData.profile.lastName}</span>
                    </div>
                  )}
                  {profileData.profile.email && (
                    <div className="flex items-center gap-2">
                      <span className="text-[var(--accent)] text-xs font-semibold uppercase tracking-wider">Email:</span>
                      <span>{profileData.profile.email}</span>
                    </div>
                  )}
                  {profileData.profile.createdAt && (
                    <div className="flex items-center gap-2">
                      <span className="text-[var(--accent)] text-xs font-semibold uppercase tracking-wider">Joined:</span>
                      <span>{new Date(profileData.profile.createdAt).toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' })}</span>
                    </div>
                  )}
                </div>
                
                <div className="profile-stats mt-6">
                  <span className="profile-stat-link" onClick={() => navigate(`/profile/${username}/followers`)}>
                    <strong>{profileData.profile.followersCount || 0}</strong> Followers
                  </span>
                  <span className="profile-stat-link" onClick={() => navigate(`/profile/${username}/following`)}>
                    <strong>{profileData.profile.followingCount || 0}</strong> Following
                  </span>
                </div>
              </div>
              <div className="profile-actions">
                {isOwnProfile ? (
                  <Button variant="outline">Edit Profile</Button>
                ) : (
                  <>
                    <Button 
                      variant={isFollowing ? "outline" : "primary"}
                      onClick={handleFollowToggle}
                      disabled={isFollowingPending}
                    >
                      {isFollowing ? "Unfollow" : "Follow"}
                    </Button>
                    <button
                      className="dm-message-profile-btn"
                      onClick={() => openDM({
                        _id: profileData.profile.id || profileData.profile._id,
                        username: profileData.profile.username,
                        fullName: profileData.profile.fullName,
                        avatar: profileData.profile.avatar,
                      })}
                      title={`Message @${profileData.profile.username}`}
                    >
                      <MessageSquare size={16} className="inline mr-1" /> Message
                    </button>
                  </>
                )}
              </div>
            </div>

            <ActivityDashboard data={dashboardData} isOwnProfile={isOwnProfile} />

            <h2 className="mt-section mb-6 text-2xl font-bold text-[var(--text-primary)]">Public Projects</h2>

            {profileData.publicProjects.length === 0 ? (
              <div className="empty-state">
                <h3>No public projects</h3>
                <p>@{profileData.profile.username} hasn't published any public projects yet.</p>
              </div>
            ) : (
              <div className="projects-grid">
                {profileData.publicProjects.map((project) => (
                  <ProjectCard
                    key={project._id}
                    project={project}
                    onOpen={(p) => navigate(`/editor/${p.roomId || p._id}`, {
                      state: { username: profileData.profile.username, projectId: p._id },
                    })}
                    onShare={() => toast.error("You cannot share someone else's public project")}
                    onDelete={() => toast.error("You cannot delete someone else's public project")}
                  />
                ))}
              </div>
            )}

            {/* Modals */}
            {listType && (
              <UserListModal 
                type={listType} 
                username={username} 
                onClose={() => navigate(`/profile/${username}`)} 
              />
            )}
          </>
        ) : (
          <div className="empty-state">
            <h3>Profile not found</h3>
          </div>
        )}
      </div>
    </div>
  );
}

export default PublicProfile;
