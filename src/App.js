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
    }
  }, [token]);

  useEffect(() => {
    const fetchSearch = async () => {
      if (!searchInput.trim()) return setSearchResults([]);
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
    fetchSearch();
  }, [searchInput, token]);

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

  const fetchProfile = async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/profiles/random`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProfile(res.data);
    } catch (err) {
      console.error("❌ /profiles/random error:", err);
    }
  };

  const likeProfile = async (targetProfile, fetchNext = false) => {
    if (!token || !targetProfile) return;
    try {
      await axios.post(
        `${BACKEND_URL}/like/${targetProfile._id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (fetchNext) fetchProfile();
    } catch (err) {
      console.error("❌ Like error:", err);
    }
  };

  // Swipe-like function for the profile card
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

  return (
    <div className="app">
      <h1 className="title">YCrush 💙</h1>
      {user ? (
        <>
          <div className="user-box">
            <p>
              Logged in as: <strong>{user.firstName} {user.lastName}</strong>
            </p>
          </div>
          <div className="btn-row">
            <button onClick={logout} className="btn btn-logout">Logout</button>
            <Link to="/matches" className="btn btn-matches">Matches</Link>
          </div>

          {/* Random Profile Section with swipe effect */}
          <div className="profile-card" ref={profileCardRef}>
            {profile ? (
              <>
                <img
                  src={profile.photo || "https://picsum.photos/150"}
                  alt="Profile"
                  className="profile-photo"
                />
                <h2>{profile.firstName} {profile.lastName}, {profile.year}</h2>
                <p>{profile.college}</p>
                <div className="btn-row">
                  <button className="btn btn-like hover-grow" onClick={swipeLike}>
                    Like
                  </button>
                </div>
              </>
            ) : (
              <p>Loading profile...</p>
            )}
          </div>

          {/* Search Container fixed at the bottom */}
          <div className="search-container-bottom">
            <input
              type="text"
              placeholder="Search by exact name..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="search-input"
            />
            {searchResults.length > 0 && (
              <div className="search-results-bottom">
                {searchResults.map((match) => (
                  <div key={match._id} className="match-box">
                    <img
                      src={match.photo || "https://picsum.photos/50"}
                      alt="Match"
                      className="match-photo"
                    />
                    <div className="match-info">
                      <p>
                        <strong>{match.firstName} {match.lastName}</strong>
                      </p>
                      <p>{match.college}</p>
                    </div>
                    <button className="btn btn-like hover-grow" onClick={() => likeProfile(match)}>
                      Like
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <button onClick={login} className="btn btn-login">
          Login with Yale CAS
        </button>
      )}
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
      navigate("/");
    } else {
      console.error("❌ No token found in callback");
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
      </Routes>
    </Router>
  );
}

export default App;
