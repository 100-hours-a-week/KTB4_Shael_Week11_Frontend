import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./components/common";
import { LoginPage, SignupPage } from "./pages/AuthPages";
import { PasswordEditPage, ProfileEditPage } from "./pages/UserPages";
import { PostsPage } from "./pages/PostsPage";
import { PostFormPage } from "./pages/PostFormPage";
import { PostDetailPage } from "./pages/PostDetailPage";

const Protected = ({ children }) => <ProtectedRoute>{children}</ProtectedRoute>;

export default function App() {
  return <Routes>
    <Route path="/login/login.html" element={<LoginPage />} />
    <Route path="/signup/signup.html" element={<SignupPage />} />
    <Route path="/posts/posts.html" element={<Protected><PostsPage /></Protected>} />
    <Route path="/post-detail/post-detail.html" element={<Protected><PostDetailPage /></Protected>} />
    <Route path="/post-form/post-create.html" element={<Protected><PostFormPage mode="create" /></Protected>} />
    <Route path="/post-form/post-edit.html" element={<Protected><PostFormPage mode="edit" /></Protected>} />
    <Route path="/profile-edit/profile-edit.html" element={<Protected><ProfileEditPage /></Protected>} />
    <Route path="/password-edit/password-edit.html" element={<Protected><PasswordEditPage /></Protected>} />
    <Route path="*" element={<Navigate to="/login/login.html" replace />} />
  </Routes>;
}
