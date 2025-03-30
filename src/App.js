import React, { useEffect, useState, useRef } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useNavigate,
  useLocation,
  Link,
} from "react-router-dom";
import axios from "axios";
import "./index.css";
import { io } from "socket.io-client";

const BACKEND_URL = "https://ycrush-backend.onrender.com";
const socket = io(BACKEND_URL);

function Home() {
  const [token, setToken] = useState(localStorage.getItem("authToken"));
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [searchInput, setSearchInput] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [likesCount, setLikesCount] = useState(0);
  const [yearFilters, setYearFilters] = useState({
    2024: true,
    2025: true,
    2026: true,
    2027: true
  });
  const [yearFiltersOpen, setYearFiltersOpen] = useState(false);

  const navigate = useNavigate();
  const profileCardRef = useRef(null);

  useEffect(() => {
    const storedToken = localStorage.getItem("authToken");
    if (storedToken) setToken(storedToken);
  }, []);

  useEffect(() => {
    if (token) {
      fetchUser();
      fetchProfile();
      fetchLikesCount();
    }
  }, [token]);

  // Fetch current user details
  const fetchUser = async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser(res.data);
    } catch (err) {
      console.error("❌ /me error:", err);
    }
  };

  // Fetch a random profile that matches your preferences
  const fetchProfile = async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/profiles/random`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          years: JSON.stringify(yearFilters)
        }
      });
      setProfile(res.data);
    } catch (err) {
      console.error("❌ /profiles/random error:", err);
      setProfile(null);
    }
  };

  // Fetch count of people who liked you
  const fetchLikesCount = async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/who-liked-me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLikesCount(res.data.length);
    } catch (err) {
      console.error("❌ Error fetching likes:", err);
    }
  };

  // Search for people (also filtered by your matching preferences)
  useEffect(() => {
    const fetchSearch = async () => {
      if (!searchInput.trim()) {
        setSearchResults([]);
        return;
      }
      try {
        const res = await axios.get(
          `${BACKEND_URL}/profiles/search?q=${encodeURIComponent(searchInput)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setSearchResults(res.data);
      } catch (err) {
        console.error("❌ Search error:", err);
      }
    };
    if (token) fetchSearch();
  }, [searchInput, token]);

  // Like a profile: calls the backend to update your likes and the other person's likedBy
  const likeProfile = async (targetProfile, fetchNext = false) => {
    if (!token || !targetProfile) return;
    try {
      await axios.post(
        `${BACKEND_URL}/like/${targetProfile._id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (fetchNext) {
        fetchProfile();
      }
      fetchLikesCount();
    } catch (err) {
      console.error("❌ Like error:", err);
    }
  };

  // Optional "swipe-like" effect for the random profile card
  const swipeLike = () => {
    if (profileCardRef.current && profile) {
      profileCardRef.current.classList.add("swipe-out");
      setTimeout(() => {
        likeProfile(profile, true);
        profileCardRef.current.classList.remove("swipe-out");
      }, 300);
    }
  };

  const login = () => {
    window.location.href = `${BACKEND_URL}/auth/cas/token`;
  };

  const logout = () => {
    localStorage.removeItem("authToken");
    setToken(null);
    setUser(null);
    navigate("/");
  };

  // Handle year filter changes
  const handleYearFilterChange = (year) => {
    const newFilters = {
      ...yearFilters,
      [year]: !yearFilters[year]
    };
    setYearFilters(newFilters);
    // Fetch new profile when filters change
    fetchProfile();
  };

  return (
    <div className="app">
      <div className={`nav-bar ${!user ? 'nav-bar-centered' : ''}`}>
        <div className="nav-left">
      <h1 className="title">YCrush 💙</h1>
        </div>
        {user && (
          <div className="nav-right">
            <Link to="/profile" className="nav-btn">✏️ Edit Profile</Link>
            <Link to="/matches" className="nav-btn">👥 Matches</Link>
            <button onClick={logout} className="nav-btn nav-btn-logout">Logout</button>
          </div>
        )}
      </div>

      {user ? (
        <>
          <p className="likes-count">You have {likesCount} {likesCount === 1 ? 'like' : 'likes'}.</p>

          <div className="profile-card" ref={profileCardRef}>
            <div className="year-filter-menu">
              <button 
                className="year-filter-btn" 
                onClick={() => setYearFiltersOpen(!yearFiltersOpen)}
              >
                🎓
              </button>
              {yearFiltersOpen && (
                <div className="year-filter-content">
                  {Object.entries(yearFilters).map(([year, checked]) => (
                    <label key={year} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => handleYearFilterChange(year)}
                      />
                      {year}
                    </label>
                  ))}
                </div>
              )}
            </div>

            {profile ? (
              <>
                <img
                  src={profile.photo || "https://picsum.photos/300"}
                  alt="Profile"
                  className="profile-photo"
                />
                <h2>
                  {profile.firstName} {profile.lastName}, {profile.year}
                </h2>
                <p>{profile.college}</p>
                {profile.bio && <p className="bio">{profile.bio}</p>}
                <div className="btn-row">
                  <button className="btn btn-like" onClick={swipeLike}>Like</button>
                  <button className="btn btn-skip" onClick={fetchProfile}>Next</button>
                </div>
              </>
            ) : (
              <div className="no-profiles">
                <p>No more profiles to show.</p>
                <p>Try adjusting your year filters or check back later!</p>
              </div>
            )}
          </div>

          <div className="search-box">
            <input
              type="text"
              placeholder="Search by exact name..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="search-input"
            />
          </div>
          {searchResults.length > 0 && (
            <div className="matches">
              <h3>Search Results</h3>
              {searchResults.map((match) => (
                <div key={match._id} className="match-box">
                  <div className="match-left">
                  <img
                      src={match.photo || "https://picsum.photos/100"}
                    alt="Match"
                    className="match-photo"
                  />
                    <div className="match-info">
                      <p className="match-name">{match.firstName} {match.lastName}</p>
                      <p className="match-college">{match.college}</p>
                      {match.bio && <p className="bio">{match.bio}</p>}
                    </div>
                  </div>
                  <button className="btn btn-like" onClick={() => likeProfile(match)}>
                    Like
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <button onClick={login} className="btn btn-login">
          Login with Yale CAS
        </button>
      )}
    </div>
  );
}

// New component for editing your profile (including new fields)
function ProfileEdit() {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const token = localStorage.getItem("authToken");
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get(`${BACKEND_URL}/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setProfileData(res.data);
        setLoading(false);
      } catch (err) {
        console.error("❌ Error fetching profile:", err);
        setError("Failed to load profile");
        setLoading(false);
      }
    };
    fetchProfile();
  }, [token]);

  const handleChange = (e) => {
    setProfileData({ ...profileData, [e.target.name]: e.target.value });
  };

  const handleCheckboxChange = (e) => {
    const { value, checked } = e.target;
    let newLookingFor = profileData.lookingFor ? [...profileData.lookingFor] : [];
    if (checked) {
      if (!newLookingFor.includes(value)) {
        newLookingFor.push(value);
      }
    } else {
      newLookingFor = newLookingFor.filter((v) => v !== value);
    }
    setProfileData({ ...profileData, lookingFor: newLookingFor });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    // Validate required fields
    if (!profileData.photo || !profileData.bio || !profileData.gender || !profileData.lookingFor?.length) {
      setError("Please fill in all required fields");
      setSaving(false);
      return;
    }

    try {
      const res = await axios.put(
        `${BACKEND_URL}/me`,
        profileData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log("Profile updated", res.data);
      navigate("/");
    } catch (err) {
      console.error("❌ Error updating profile:", err);
      setError("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB');
      return;
    }

    setUploadingImage(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await axios.post(
        `${BACKEND_URL}/upload-image`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`
          }
        }
      );

      setProfileData({ ...profileData, photo: res.data.url });
    } catch (err) {
      console.error('❌ Error uploading image:', err);
      setError('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  if (loading) return <div className="app"><p>Loading...</p></div>;

  return (
    <div className="app">
      <div className="nav-bar">
        <div className="nav-left">
          <h1 className="title">YCrush 💙</h1>
        </div>
        <div className="nav-right">
          <Link to="/" className="nav-btn">← Back to Home</Link>
        </div>
      </div>

      <h2 className="section-title">Complete Your Profile</h2>
      {error && <p className="error">{error}</p>}
      <form onSubmit={handleSubmit} className="profile-form">
        <div className="form-group">
          <label>Profile Picture *</label>
          <div className="image-upload">
            {profileData?.photo && (
              <img 
                src={profileData.photo} 
                alt="Profile Preview" 
                className="image-preview"
              />
            )}
          <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              ref={fileInputRef}
              style={{ display: 'none' }}
            />
            <button
              type="button"
              className="btn btn-upload"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingImage}
            >
              {uploadingImage ? 'Uploading...' : 'Choose Image'}
            </button>
          </div>
        </div>

        <div className="form-group">
          <label>Bio *</label>
          <textarea
            name="bio"
            value={profileData.bio || ""}
            onChange={handleChange}
            placeholder="Tell us about yourself..."
            required
            rows="4"
          />
        </div>

        <div className="form-group">
          <label>Gender *</label>
          <select
            name="gender"
            value={profileData.gender || ""}
            onChange={handleChange}
            required
          >
            <option value="">Select your gender</option>
            <option value="men">Men</option>
            <option value="women">Women</option>
            <option value="non-binary">Non-binary</option>
          </select>
        </div>

        <div className="form-group">
          <label>I'm looking for *</label>
          <div className="checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="lookingFor"
                value="men"
                checked={profileData.lookingFor?.includes("men") || false}
                onChange={handleCheckboxChange}
              />
              Men
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="lookingFor"
                value="women"
                checked={profileData.lookingFor?.includes("women") || false}
                onChange={handleCheckboxChange}
              />
              Women
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="lookingFor"
                value="non-binary"
                checked={profileData.lookingFor?.includes("non-binary") || false}
                onChange={handleCheckboxChange}
              />
              Non-binary
            </label>
          </div>
        </div>

        <div className="form-group">
          <button type="submit" className="btn" disabled={saving}>
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Chat({ match, onClose }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);
  const token = localStorage.getItem("authToken");
  const [currentUser, setCurrentUser] = useState(null);

  // Fetch current user
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await axios.get(`${BACKEND_URL}/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCurrentUser(res.data);
        socket.emit('join', res.data._id);
      } catch (err) {
        console.error("Error fetching user:", err);
      }
    };
    fetchUser();
  }, [token]);

  // Fetch existing messages
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await axios.get(`${BACKEND_URL}/chat/${match._id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        // Mark all existing messages as received
        const markedMessages = res.data.map(msg => ({
          ...msg,
          isReceived: true
        }));
        setMessages(markedMessages);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching messages:", err);
        setLoading(false);
      }
    };
    if (currentUser) {
      fetchMessages();
    }
  }, [match._id, token, currentUser]);

  // Handle incoming messages
  useEffect(() => {
    const handleNewMessage = (message) => {
      // Mark incoming messages as received
      setMessages(prev => [...prev, { ...message, isReceived: true }]);
    };

    socket.on('new_message', handleNewMessage);
    return () => socket.off('new_message', handleNewMessage);
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser) return;

    const messageData = {
      sender: currentUser._id,
      receiver: match._id,
      content: newMessage.trim(),
      timestamp: new Date(),
      isReceived: false // Mark as sent by current user
    };

    // Add to local state first
    setMessages(prev => [...prev, messageData]);
    
    // Send to server
    socket.emit('private_message', messageData);
    setNewMessage("");
  };

  if (loading) {
    return (
      <div className="chat-container">
        <div className="chat-header">
          <img src={match.photo || "https://picsum.photos/50"} alt="Match" className="chat-avatar" />
          <h3>{match.firstName} {match.lastName}</h3>
          <button onClick={onClose} className="btn-close">×</button>
        </div>
        <div className="messages-container">
          <p>Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-container">
      <div className="chat-header">
        <img src={match.photo || "https://picsum.photos/50"} alt="Match" className="chat-avatar" />
        <h3>{match.firstName} {match.lastName}</h3>
        <button onClick={onClose} className="btn-close">×</button>
      </div>

      <div className="messages-container">
        {messages.map((message, index) => {
          // Use isReceived flag instead of comparing sender IDs
          const isReceived = message.isReceived;
          return (
            <div
              key={index}
              className={`message-wrapper ${isReceived ? 'received' : 'sent'}`}
            >
              <div className={`message ${isReceived ? 'received' : 'sent'}`}>
                <div className="message-content">
                  {message.content}
                </div>
                <div className="message-time">
                  {new Date(message.timestamp).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} className="message-form">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="message-input"
        />
        <button type="submit" className="btn-send">Send</button>
      </form>
    </div>
  );
}

function MatchesPage() {
  const [matches, setMatches] = useState([]);
  const [likesCount, setLikesCount] = useState(0);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const token = localStorage.getItem("authToken");

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const res = await axios.get(`${BACKEND_URL}/who-liked-me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setMatches(res.data);
        setLikesCount(res.data.length);
      } catch (err) {
        console.error("❌ Error fetching matches:", err);
      }
    };
    fetchMatches();
  }, [token]);

  return (
    <div className="app">
      <div className="nav-bar">
        <div className="nav-left">
          <h1 className="title">YCrush 💙</h1>
        </div>
        <div className="nav-right">
          <Link to="/" className="nav-btn">← Back to Home</Link>
        </div>
      </div>

      <h2 className="section-title">Your Matches ({likesCount})</h2>
      
      <div className="matches-container">
        <div className="matches-list">
          {matches.map((match) => (
            <div
              key={match._id}
              className={`match-box ${selectedMatch?._id === match._id ? 'selected' : ''}`}
              onClick={() => setSelectedMatch(match)}
            >
            <img
              src={match.photo || "https://picsum.photos/50"}
              alt="Match"
              className="match-photo"
            />
              <div className="match-info">
                <p className="match-name">{match.firstName} {match.lastName}</p>
                <p className="match-college">{match.college}</p>
              </div>
          </div>
        ))}
        </div>

        {selectedMatch && (
          <Chat
            match={selectedMatch}
            onClose={() => setSelectedMatch(null)}
          />
        )}
      </div>
    </div>
  );
}

function AuthCallback() {
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const token = query.get("token");
    if (token) {
      localStorage.setItem("authToken", token);
      // Check if profile is complete before redirecting
      axios.get(`${BACKEND_URL}/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => {
        const user = res.data;
        if (!user.photo || !user.bio || !user.gender || !user.lookingFor?.length) {
          navigate("/profile");
        } else {
          navigate("/");
        }
      })
      .catch(err => {
        console.error("❌ Error checking profile:", err);
      navigate("/");
      });
    } else {
      console.error("❌ No token found in callback");
      navigate("/");
    }
  }, [location, navigate]);
  return <p>Logging in...</p>;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/auth" element={<AuthCallback />} />
        <Route path="/" element={<Home />} />
        <Route path="/matches" element={<MatchesPage />} />
        <Route path="/profile" element={<ProfileEdit />} />
      </Routes>
    </Router>
  );
}

export default App;
