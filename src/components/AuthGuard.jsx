import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Shield, Battery, AlertCircle } from 'lucide-react';
import { useLoginMutation, useRegisterMutation } from '../store/api/authApi';
import { setCredentials, selectIsAuthenticated, selectAuthError } from '../store/slices/authSlice';
import socketService from '../services/socketService';

const AuthGuard = ({ children }) => {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const authError = useSelector(selectAuthError);
  
  const [login, { isLoading: isLoginLoading }] = useLoginMutation();
  const [register, { isLoading: isRegisterLoading }] = useRegisterMutation();
  
  const [loginForm, setLoginForm] = useState({
    identifier: '',
    password: '',
  });
  
  const [registerForm, setRegisterForm] = useState({
    username: '',
    email: '',
    password: '',
    firstName: '',
    lastName: '',
  });
  
  const [error, setError] = useState('');

  useEffect(() => {
    // Connect to WebSocket when authenticated
    if (isAuthenticated) {
      const state = store.getState();
      if (state.auth.token) {
        socketService.connect(state.auth.token);
      }
    }
  }, [isAuthenticated]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      const result = await login(loginForm).unwrap();
      dispatch(setCredentials(result));
      
      // Connect to WebSocket
      socketService.connect(result.tokens.accessToken);
    } catch (err) {
      setError(err.data?.error || 'Login failed');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      const result = await register(registerForm).unwrap();
      dispatch(setCredentials(result));
      
      // Connect to WebSocket
      socketService.connect(result.tokens.accessToken);
    } catch (err) {
      setError(err.data?.error || 'Registration failed');
    }
  };

  if (isAuthenticated) {
    return children;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-purple-600 p-3 rounded-full">
              <Battery className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            PBR Battery System
          </h1>
          <p className="text-slate-300">
            Shipment Monitoring & Control
          </p>
        </div>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Authentication Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2 bg-slate-700">
                <TabsTrigger value="login" className="data-[state=active]:bg-purple-600">
                  Login
                </TabsTrigger>
                <TabsTrigger value="register" className="data-[state=active]:bg-purple-600">
                  Register
                </TabsTrigger>
              </TabsList>

              {(error || authError) && (
                <Alert className="border-red-500 bg-red-500/10">
                  <AlertCircle className="h-4 w-4 text-red-400" />
                  <AlertDescription className="text-red-300">
                    {error || authError}
                  </AlertDescription>
                </Alert>
              )}

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="identifier" className="text-slate-300">
                      Username or Email
                    </Label>
                    <Input
                      id="identifier"
                      type="text"
                      value={loginForm.identifier}
                      onChange={(e) => setLoginForm(prev => ({
                        ...prev,
                        identifier: e.target.value
                      }))}
                      className="bg-slate-700 border-slate-600 text-white"
                      placeholder="Enter username or email"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-slate-300">
                      Password
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm(prev => ({
                        ...prev,
                        password: e.target.value
                      }))}
                      className="bg-slate-700 border-slate-600 text-white"
                      placeholder="Enter password"
                      required
                    />
                  </div>
                  
                  <Button
                    type="submit"
                    className="w-full bg-purple-600 hover:bg-purple-700"
                    disabled={isLoginLoading}
                  >
                    {isLoginLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Signing In...
                      </>
                    ) : (
                      'Sign In'
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName" className="text-slate-300">
                        First Name
                      </Label>
                      <Input
                        id="firstName"
                        type="text"
                        value={registerForm.firstName}
                        onChange={(e) => setRegisterForm(prev => ({
                          ...prev,
                          firstName: e.target.value
                        }))}
                        className="bg-slate-700 border-slate-600 text-white"
                        placeholder="First name"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="lastName" className="text-slate-300">
                        Last Name
                      </Label>
                      <Input
                        id="lastName"
                        type="text"
                        value={registerForm.lastName}
                        onChange={(e) => setRegisterForm(prev => ({
                          ...prev,
                          lastName: e.target.value
                        }))}
                        className="bg-slate-700 border-slate-600 text-white"
                        placeholder="Last name"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-slate-300">
                      Username
                    </Label>
                    <Input
                      id="username"
                      type="text"
                      value={registerForm.username}
                      onChange={(e) => setRegisterForm(prev => ({
                        ...prev,
                        username: e.target.value
                      }))}
                      className="bg-slate-700 border-slate-600 text-white"
                      placeholder="Choose username"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-slate-300">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={registerForm.email}
                      onChange={(e) => setRegisterForm(prev => ({
                        ...prev,
                        email: e.target.value
                      }))}
                      className="bg-slate-700 border-slate-600 text-white"
                      placeholder="Enter email"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="registerPassword" className="text-slate-300">
                      Password
                    </Label>
                    <Input
                      id="registerPassword"
                      type="password"
                      value={registerForm.password}
                      onChange={(e) => setRegisterForm(prev => ({
                        ...prev,
                        password: e.target.value
                      }))}
                      className="bg-slate-700 border-slate-600 text-white"
                      placeholder="Create password"
                      required
                    />
                  </div>
                  
                  <Button
                    type="submit"
                    className="w-full bg-purple-600 hover:bg-purple-700"
                    disabled={isRegisterLoading}
                  >
                    {isRegisterLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating Account...
                      </>
                    ) : (
                      'Create Account'
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="text-center mt-6 text-slate-400 text-sm">
          <p>Demo Credentials:</p>
          <p>Username: admin | Password: admin123</p>
        </div>
      </div>
    </div>
  );
};

export default AuthGuard;
