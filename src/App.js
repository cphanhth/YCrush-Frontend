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

const BACKEND_URL = "https://ycrush-backend.onrender.com";

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
      <h1 className="title">YCrush 💙</h1>
      {user ? (
        <>
          <div className="user-box">
            <div className="user-info">
              <p>
                Logged in as: <strong>{user.firstName} {user.lastName}</strong>
              </p>
              <Link to="/profile" className="btn btn-edit-profile">
                ✏️ Edit Your Profile
              </Link>
            </div>
          </div>

          <p className="likes-count">You have {likesCount} like(s).</p>

          <div className="btn-row">
            <button onClick={logout} className="btn btn-logout">Logout</button>
            <Link to="/matches" className="btn btn-matches">Matches</Link>
          </div>

          <div className="year-filters">
            <h3>Filter by Class Year:</h3>
            <div className="checkbox-group">
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
          </div>

          <div className="profile-card" ref={profileCardRef}>
            {profile ? (
              <>
                <img
                  src={profile.photo || "https://picsum.photos/150"}
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
                  <img
                    src={match.photo || "https://picsum.photos/50"}
                    alt="Match"
                    className="match-photo"
                  />
                  <div>
                    <p>
                      <strong>{match.firstName} {match.lastName}</strong>
                    </p>
                    <p>{match.college}</p>
                    {match.bio && <p className="bio">{match.bio}</p>}
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
  const token = localStorage.getItem("authToken");
  const navigate = useNavigate();

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

  if (loading) return <div className="app"><p>Loading...</p></div>;

  return (
    <div className="app">
      <h1 className="title">Complete Your Profile</h1>
      {error && <p className="error">{error}</p>}
      <form onSubmit={handleSubmit} className="profile-form">
        <div className="form-group">
          <label>Profile Picture URL *</label>
          <input
            name="photo"
            type="text"
            value={profileData.photo || ""}
            onChange={handleChange}
            placeholder="Enter image URL"
            required
          />
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

function MatchesPage() {
  const [matches, setMatches] = useState([]);
  const [likesCount, setLikesCount] = useState(0);
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
      <h1 className="title">Your Matches ({likesCount})</h1>
      <Link to="/" className="btn btn-skip">← Back</Link>
      <div className="matches">
        {matches.map((match, i) => (
          <div key={i} className="match-box">
            <img
              src={match.photo || "https://picsum.photos/50"}
              alt="Match"
              className="match-photo"
            />
            <p>{match.firstName} {match.lastName}</p>
          </div>
        ))}
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
