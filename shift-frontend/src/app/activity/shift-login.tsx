import { useState } from "react";
import { Box, Button, TextField, Typography, Paper, Alert, ToggleButton, ToggleButtonGroup, InputAdornment, IconButton } from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import PersonOutline from "@mui/icons-material/Person";
import EmailOutlined from "@mui/icons-material/EmailOutlined";
import LockOutlined from "@mui/icons-material/LockOutlined";
import axios from "axios";

type LoginProps = {
    onLoginSuccess: (token: string, role: string, username: string) => void;
};

function ShiftLogin({ onLoginSuccess }: LoginProps) {
    const [mode, setMode] = useState<"login" | "register">("login");
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);

    const handleModeChange = (_: React.MouseEvent<HTMLElement>, value: "login" | "register" | null) => {
        if (!value || loading) return;
        setMode(value);
        setError("");
        setSuccess("");
        setPassword("");
        setConfirmPassword("");
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError("");
        setSuccess("");
        const cleanUsername = username.trim();
        const cleanEmail = email.trim();

        if (!cleanUsername) {
            setError("Username is required.");
            return;
        }

        if (mode === "register") {
            if (!cleanEmail) {
                setError("Email is required.");
                return;
            }
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
                setError("Please enter a valid email address.");
                return;
            }
            if (password.length < 8) {
                setError("Password must contain at least 8 characters.");
                return;
            }
            if (password !== confirmPassword) {
                setError("Passwords do not match.");
                return;
            }
        }

        setLoading(true);
        try {
            if (mode === "register") {
                const response = await axios.post("https://api-gateway-b427.onrender.com/user/register", {
                    username: cleanUsername,
                    email: cleanEmail,
                    password
                });
                setMode("login");
                setEmail("");
                setPassword("");
                setConfirmPassword("");
                setSuccess(typeof response.data === "string" ? response.data : "Registration successful. Please log in.");
            } else {
                const response = await axios.post("https://api-gateway-b427.onrender.com/user/login", {
                    username: cleanUsername,
                    password
                });
                const { token, role } = response.data;
                if (!token || !role) {
                    setError("Invalid login response from server.");
                    return;
                }
                onLoginSuccess(token, role, cleanUsername);
            }
        } catch (err) {
            if (axios.isAxiosError(err)) {
                console.error("Register/Login error:", err);
                console.error("Response:", err.response);
                const responseMessage = err.response?.data?.detail || err.response?.data?.message;
                if (err.response?.status === 409) {
                    setError(typeof responseMessage === "string" ? responseMessage : "Username or email already exists.");
                } else if (err.response?.status === 400) {
                    setError(typeof responseMessage === "string" ? responseMessage : "Please check the registration details.");
                } else if (mode === "register") {
                    setError(typeof responseMessage === "string" ? responseMessage : "Registration failed. Please try again.");
                } else if (err.response?.status === 403) {
                    setError(typeof responseMessage === "string" ? responseMessage : "User is inactive. Please contact your administrator.");
                } else if (err.response?.status === 401) {
                    setError(typeof responseMessage === "string"? responseMessage: "Invalid username or password.");
                } else {
                    setError("Login failed. Please try again.");
                }
            } else {
                setError("Something went wrong. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #eef4ff 0%, #f8fafc 55%, #e7efff 100%)", p: 2 }}>
            <Paper elevation={0} sx={{ width: "100%", maxWidth: 440, p: { xs: 3, sm: 4 }, borderRadius: 4, border: "1px solid #e2e8f0", boxShadow: "0 18px 50px rgba(15, 23, 42, 0.10)" }}>
                <Box sx={{ textAlign: "center", mb: 3 }}>
                    <Box component="img" src="/dreamsol-logo.jpg" alt="DreamSol TeleSolutions" sx={{ height: 52, maxWidth: 220, objectFit: "contain", mb: 2 }} />
                    <Typography variant="h5" sx={{ fontWeight: 800, color: "#172554" }}>Shift Master</Typography>
                    <Typography sx={{ color: "#64748b", mt: 0.75, fontSize: 14 }}>
                        {mode === "login" ? "Sign in to continue to your account" : "Create your Shift Master account"}
                    </Typography>
                </Box>
                <ToggleButtonGroup fullWidth exclusive value={mode} onChange={handleModeChange} sx={{ mb: 2.5, p: 0.5, bgcolor: "#f1f5f9", borderRadius: 2, "& .MuiToggleButton-root": { border: 0, borderRadius: "8px !important", py: 1, textTransform: "none", fontWeight: 700, color: "#64748b" }, "& .Mui-selected": { bgcolor: "#fff !important", color: "#1565c0 !important", boxShadow: "0 2px 8px rgba(15,23,42,0.10)" } }}>
                    <ToggleButton value="login">Login</ToggleButton>
                    <ToggleButton value="register">Register</ToggleButton>
                </ToggleButtonGroup>
                {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}
                {success && <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>{success}</Alert>}
                <Box component="form" onSubmit={handleSubmit}>
                    <TextField fullWidth label="Username" value={username} onChange={(event) => setUsername(event.target.value)} margin="normal" required autoComplete="username" slotProps={{ htmlInput: { maxLength: 50 }, input: { startAdornment: <InputAdornment position="start"><PersonOutline color="action" /></InputAdornment> } }} />
                    {mode === "register" && (
                        <TextField fullWidth label="Email address" type="email" value={email} onChange={(event) => setEmail(event.target.value)} margin="normal" required autoComplete="email" slotProps={{ input: { startAdornment: <InputAdornment position="start"><EmailOutlined color="action" /></InputAdornment> } }} />
                    )}
                    <TextField fullWidth label="Password" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} margin="normal" required autoComplete={mode === "login" ? "current-password" : "new-password"} slotProps={{ htmlInput: { minLength: mode === "register" ? 8 : undefined }, input: { startAdornment: <InputAdornment position="start"><LockOutlined color="action" /></InputAdornment>, endAdornment: <InputAdornment position="end"><IconButton aria-label="Toggle password visibility" onClick={() => setShowPassword((previous) => !previous)} edge="end">{showPassword ? <VisibilityOff /> : <Visibility />}</IconButton></InputAdornment> } }} />
                    {mode === "register" && (
                        <TextField fullWidth label="Confirm Password" type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} margin="normal" required autoComplete="new-password" slotProps={{ input: { startAdornment: <InputAdornment position="start"><LockOutlined color="action" /></InputAdornment>, endAdornment: <InputAdornment position="end"><IconButton aria-label="Toggle confirm password visibility" onClick={() => setShowConfirmPassword((previous) => !previous)} edge="end">{showConfirmPassword ? <VisibilityOff /> : <Visibility />}</IconButton></InputAdornment> } }} />
                    )}
                    <Button fullWidth type="submit" variant="contained" disabled={loading} sx={{ mt: 3, py: 1.35, borderRadius: 2, fontWeight: 700, textTransform: "none", fontSize: 15, boxShadow: "none", bgcolor: "#1976d2", "&:hover": { bgcolor: "#1259a7", boxShadow: "none" } }}>
                        {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
                    </Button>
                </Box>
                <Typography variant="caption" sx={{ display: "block", textAlign: "center", color: "#94a3b8", mt: 3 }}>
                    Secure access to Shift Master
                </Typography>
            </Paper>
        </Box>
    );
}

export default ShiftLogin;