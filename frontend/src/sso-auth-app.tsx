import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Badge,
  Box,
  Button,
  Container,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  Icon,
  Input,
  List,
  ListIcon,
  ListItem,
  SimpleGrid,
  Spinner,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  VStack,
} from "@chakra-ui/react";
import { CheckCircleIcon, ExternalLinkIcon, LockIcon } from "@chakra-ui/icons";
import { ChakraProvider } from "@chakra-ui/react";

import { theme } from "./theme";

type TokenPair = {
  access: string;
  refresh: string;
};

type Feedback = {
  type: "success" | "error";
  title?: string;
  message: string;
} | null;

type PermissionInfo = {
  admin_user?: boolean;
} | null;

type UserInfo = {
  username: string;
  email: string;
  permission?: PermissionInfo;
};

type PortalContext = {
  nextUrl?: string;
  sessionUser?: {
    username: string;
    email: string;
    permission?: PermissionInfo;
  } | null;
  isAuthenticated?: boolean;
};

const loadPortalContext = (): PortalContext => {
  const script = document.getElementById("sso-auth-context");
  if (!script) {
    return {};
  }
  try {
    return JSON.parse(script.textContent || "{}") as PortalContext;
  } catch (error) {
    console.warn("Unable to parse portal context payload", error);
    return {};
  }
};

const portalContext = loadPortalContext();

const sanitizeNextUrl = (value?: string): string => {
  if (!value) {
    return "";
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const parsed = new URL(trimmed);
      if (parsed.origin !== window.location.origin) {
        return "";
      }
      return parsed.pathname + parsed.search + parsed.hash;
    } catch (error) {
      console.warn("Invalid next URL provided to portal", error);
      return "";
    }
  }
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
};

const NEXT_URL = sanitizeNextUrl(portalContext.nextUrl);

const endpoints = {
  login: "/user/login/",
  register: "/user/register/",
  logout: "/user/logout/",
  userInfo: "/user-settings/info/",
  changePassword: "/user-settings/change-password/",
  changeEmail: "/user-settings/change-email/",
};

const loadStoredTokens = (): TokenPair | null => {
  try {
    const raw = window.localStorage.getItem("ssoTokens");
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as TokenPair;
    if (
      parsed &&
      typeof parsed.access === "string" &&
      typeof parsed.refresh === "string"
    ) {
      return parsed;
    }
  } catch (error) {
    console.warn("Unable to load stored tokens", error);
  }
  return null;
};

const persistTokens = (tokens: TokenPair | null) => {
  try {
    if (!tokens) {
      window.localStorage.removeItem("ssoTokens");
    } else {
      window.localStorage.setItem("ssoTokens", JSON.stringify(tokens));
    }
  } catch (error) {
    console.warn("Unable to persist tokens", error);
  }
};

const apiRequest = async <T,>(
  url: string,
  method: string,
  token?: string | null,
  payload?: Record<string, unknown>
): Promise<T> => {
  const headers: Record<string, string> = { Accept: "application/json" };
  let body: string | undefined;
  if (payload !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(payload);
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body,
      credentials: "same-origin",
    });
  } catch (error) {
    throw new Error("Network error. Please try again.");
  }

  const text = await response.text();
  let data: any = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
  }

  if (!response.ok) {
    const message =
      data?.detail ?? data?.error ?? data?.message ?? response.statusText;
    throw new Error(message || "Request failed");
  }

  return data as T;
};

const FeedbackAlert: React.FC<{
  feedback: Feedback;
  onDismiss?: () => void;
}> = ({ feedback, onDismiss }) => {
  if (!feedback) {
    return null;
  }
  return (
    <Alert status={feedback.type} variant="subtle" borderRadius="lg">
      <AlertIcon />
      <Stack spacing={1} align="flex-start">
        {feedback.title ? <AlertTitle>{feedback.title}</AlertTitle> : null}
        <AlertDescription>{feedback.message}</AlertDescription>
        {onDismiss ? (
          <Button
            size="sm"
            variant="ghost"
            colorScheme={feedback.type === "error" ? "red" : "green"}
            onClick={onDismiss}
          >
            Dismiss
          </Button>
        ) : null}
      </Stack>
    </Alert>
  );
};

const LoginForm: React.FC<{
  onSubmit: (payload: { username: string; password: string }) => void;
  loading: boolean;
  feedback: Feedback;
  onClearFeedback: () => void;
}> = ({ onSubmit, loading, feedback, onClearFeedback }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    onClearFeedback();
    onSubmit({ username: username.trim(), password });
  };

  return (
    <VStack spacing={6} align="stretch">
      <FeedbackAlert feedback={feedback} onDismiss={onClearFeedback} />
      <form onSubmit={submit}>
        <VStack spacing={4} align="stretch">
          <FormControl isRequired>
            <FormLabel htmlFor="login-username">Username</FormLabel>
            <Input
              id="login-username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
            />
          </FormControl>
          <FormControl isRequired>
            <FormLabel htmlFor="login-password">Password</FormLabel>
            <Input
              id="login-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
            />
          </FormControl>
          <Button
            type="submit"
            colorScheme="purple"
            isLoading={loading}
            loadingText="Logging in"
          >
            Log in
          </Button>
        </VStack>
      </form>
    </VStack>
  );
};

const RegisterForm: React.FC<{
  onSubmit: (payload: {
    username: string;
    email: string;
    password: string;
  }) => void;
  loading: boolean;
  feedback: Feedback;
  onClearFeedback: () => void;
}> = ({ onSubmit, loading, feedback, onClearFeedback }) => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    onClearFeedback();
    onSubmit({ username: username.trim(), email: email.trim(), password });
  };

  return (
    <VStack spacing={6} align="stretch">
      <FeedbackAlert feedback={feedback} onDismiss={onClearFeedback} />
      <form onSubmit={submit}>
        <VStack spacing={4} align="stretch">
          <FormControl isRequired>
            <FormLabel htmlFor="register-username">Username</FormLabel>
            <Input
              id="register-username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
            />
          </FormControl>
          <FormControl isRequired>
            <FormLabel htmlFor="register-email">Email</FormLabel>
            <Input
              id="register-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
            />
          </FormControl>
          <FormControl isRequired>
            <FormLabel htmlFor="register-password">Password</FormLabel>
            <Input
              id="register-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
            />
          </FormControl>
          <Button
            type="submit"
            colorScheme="purple"
            isLoading={loading}
            loadingText="Registering"
          >
            Register
          </Button>
        </VStack>
      </form>
    </VStack>
  );
};

const AuthExperience: React.FC<{
  onLogin: (payload: { username: string; password: string }) => void;
  onRegister: (payload: {
    username: string;
    email: string;
    password: string;
  }) => void;
  loginLoading: boolean;
  registerLoading: boolean;
  loginFeedback: Feedback;
  registerFeedback: Feedback;
  clearLoginFeedback: () => void;
  clearRegisterFeedback: () => void;
}> = ({
  onLogin,
  onRegister,
  loginLoading,
  registerLoading,
  loginFeedback,
  registerFeedback,
  clearLoginFeedback,
  clearRegisterFeedback,
}) => (
  <Container maxW="6xl" py={{ base: 10, md: 16 }}>
    <Stack
      direction={{ base: "column-reverse", lg: "row" }}
      spacing={{ base: 10, lg: 16 }}
      align="stretch"
    >
      <Box
        flex="1"
        bg="white"
        borderRadius="2xl"
        shadow="xl"
        p={{ base: 6, md: 10 }}
      >
        <Tabs variant="soft-rounded" colorScheme="purple">
          <TabList>
            <Tab>Log in</Tab>
            <Tab>Register</Tab>
          </TabList>
          <TabPanels pt={4}>
            <TabPanel px={0}>
              <LoginForm
                onSubmit={onLogin}
                loading={loginLoading}
                feedback={loginFeedback}
                onClearFeedback={clearLoginFeedback}
              />
            </TabPanel>
            <TabPanel px={0}>
              <RegisterForm
                onSubmit={onRegister}
                loading={registerLoading}
                feedback={registerFeedback}
                onClearFeedback={clearRegisterFeedback}
              />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>

      <Stack
        flex="1"
        spacing={8}
        justify="center"
        bgGradient="linear(to-br, purple.500, purple.700)"
        color="white"
        borderRadius="2xl"
        shadow="xl"
        p={{ base: 6, md: 10 }}
      >
        <VStack align="flex-start" spacing={4}>
          <Badge
            colorScheme="blackAlpha"
            borderRadius="full"
            px={3}
            py={1}
            fontSize="0.8rem"
          >
            Unified Access
          </Badge>
          <Heading size="xl">
            One portal for everything OAuth and user management.
          </Heading>
          <Text opacity={0.85} fontSize="lg">
            Use the account tools to obtain JSON Web Tokens, manage OAuth client
            applications, and adjust account settings without touching the
            Django admin.
          </Text>
        </VStack>
        <Stack spacing={4} fontSize="md">
          <List spacing={3}>
            <ListItem>
              <ListIcon as={CheckCircleIcon} color="green.200" />
              Manage OAuth clients and authorized tokens with a few clicks.
            </ListItem>
            <ListItem>
              <ListIcon as={CheckCircleIcon} color="green.200" />
              Secure session + JWT login keeps both APIs and browser flows in
              sync.
            </ListItem>
          </List>
          <HStack spacing={3} pt={2}>
            <Icon as={LockIcon} />
            <Text opacity={0.8}>
              Your credentials never leave the server — all requests stay on
              this origin.
            </Text>
          </HStack>
        </Stack>
      </Stack>
    </Stack>
  </Container>
);

const SettingsPanel: React.FC<{
  user: UserInfo | null;
  loadingUser: boolean;
  alert: Feedback;
  onClearAlert: () => void;
  onRefresh: () => void;
  onChangePassword: (payload: {
    old_password: string;
    new_password: string;
  }) => Promise<boolean>;
  onChangeEmail: (payload: { new_email: string }) => Promise<void>;
  onLogout: () => Promise<void>;
  passwordLoading: boolean;
  emailLoading: boolean;
  logoutLoading: boolean;
}> = ({
  user,
  loadingUser,
  alert,
  onClearAlert,
  onRefresh,
  onChangePassword,
  onChangeEmail,
  onLogout,
  passwordLoading,
  emailLoading,
  logoutLoading,
}) => {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newEmail, setNewEmail] = useState(user?.email ?? "");

  useEffect(() => {
    setNewEmail(user?.email ?? "");
  }, [user?.email]);

  const submitPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    const success = await onChangePassword({
      old_password: oldPassword,
      new_password: newPassword,
    });
    if (success) {
      setOldPassword("");
      setNewPassword("");
    }
  };

  const submitEmail = async (event: React.FormEvent) => {
    event.preventDefault();
    await onChangeEmail({ new_email: newEmail.trim() });
  };

  return (
    <VStack spacing={6} align="stretch">
      <FeedbackAlert feedback={alert} onDismiss={onClearAlert} />
      <Box bg="white" borderRadius="lg" shadow="sm" p={{ base: 5, md: 6 }}>
        <Flex justify="space-between" align="center" flexWrap="wrap" gap={4}>
          <Box>
            <Heading size="md">Profile overview</Heading>
            <Text color="gray.600">Synced with your Django account.</Text>
          </Box>
          <Button
            size="sm"
            variant="outline"
            onClick={onRefresh}
            leftIcon={loadingUser ? <Spinner size="xs" /> : undefined}
            isDisabled={loadingUser}
          >
            {loadingUser ? "Refreshing…" : "Refresh"}
          </Button>
        </Flex>
        <Stack spacing={2} mt={4} color="gray.700">
          <Text fontWeight="semibold" fontSize="lg">
            {user?.username ?? "—"}
          </Text>
          <Text>{user?.email ?? "—"}</Text>
          {user?.permission ? (
            <Badge
              colorScheme={user.permission.admin_user ? "purple" : "gray"}
              width="fit-content"
            >
              {user.permission.admin_user
                ? "Administrator access"
                : "Standard access"}
            </Badge>
          ) : null}
        </Stack>
      </Box>

      <Box bg="white" borderRadius="lg" shadow="sm" p={{ base: 5, md: 6 }}>
        <Heading size="md" mb={4}>
          Change password
        </Heading>
        <form onSubmit={submitPassword}>
          <VStack spacing={4} align="stretch">
            <FormControl isRequired>
              <FormLabel htmlFor="settings-old-password">
                Current password
              </FormLabel>
              <Input
                id="settings-old-password"
                type="password"
                value={oldPassword}
                onChange={(event) => setOldPassword(event.target.value)}
                autoComplete="current-password"
              />
            </FormControl>
            <FormControl isRequired>
              <FormLabel htmlFor="settings-new-password">
                New password
              </FormLabel>
              <Input
                id="settings-new-password"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                autoComplete="new-password"
              />
            </FormControl>
            <Button
              type="submit"
              colorScheme="purple"
              isLoading={passwordLoading}
              loadingText="Saving"
            >
              Save changes
            </Button>
          </VStack>
        </form>
      </Box>

      <Box bg="white" borderRadius="lg" shadow="sm" p={{ base: 5, md: 6 }}>
        <Heading size="md" mb={4}>
          Change email address
        </Heading>
        <form onSubmit={submitEmail}>
          <VStack spacing={4} align="stretch">
            <FormControl isRequired>
              <FormLabel htmlFor="settings-email">Email address</FormLabel>
              <Input
                id="settings-email"
                type="email"
                value={newEmail}
                onChange={(event) => setNewEmail(event.target.value)}
                autoComplete="email"
              />
            </FormControl>
            <Button
              type="submit"
              colorScheme="purple"
              isLoading={emailLoading}
              loadingText="Saving"
            >
              Save email
            </Button>
          </VStack>
        </form>
      </Box>

      <Box bg="white" borderRadius="lg" shadow="sm" p={{ base: 5, md: 6 }}>
        <Heading size="md" mb={2}>
          Session security
        </Heading>
        <Text color="gray.600">
          Revoke your tokens and close every active session.
        </Text>
        <Button
          mt={4}
          colorScheme="red"
          onClick={onLogout}
          isLoading={logoutLoading}
          loadingText="Logging out"
        >
          Log out of all sessions
        </Button>
      </Box>
    </VStack>
  );
};

type QuickLink = {
  title: string;
  description: string;
  href: string;
  colorScheme: "purple" | "blue" | "teal";
};

const QuickLinkCard: React.FC<QuickLink> = ({
  title,
  description,
  href,
  colorScheme,
}) => (
  <Box
    bg="white"
    borderRadius="lg"
    shadow="md"
    p={6}
    borderWidth="1px"
    borderColor="gray.100"
    transition="transform 0.2s, box-shadow 0.2s"
    _hover={{ transform: "translateY(-4px)", shadow: "lg" }}
  >
    <Heading size="md" mb={3}>
      {title}
    </Heading>
    <Text color="gray.600" mb={6}>
      {description}
    </Text>
    <Button
      as="a"
      href={href}
      colorScheme={colorScheme}
      variant="solid"
      rightIcon={<ExternalLinkIcon />}
    >
      Open
    </Button>
  </Box>
);

const SettingsExperience: React.FC<{
  user: UserInfo | null;
  loadingUser: boolean;
  alert: Feedback;
  onClearAlert: () => void;
  onRefresh: () => void;
  onChangePassword: (payload: {
    old_password: string;
    new_password: string;
  }) => Promise<boolean>;
  onChangeEmail: (payload: { new_email: string }) => Promise<void>;
  onLogout: () => Promise<void>;
  passwordLoading: boolean;
  emailLoading: boolean;
  logoutLoading: boolean;
  showContinueCard: boolean;
  nextUrl: string;
}> = ({
  user,
  loadingUser,
  alert,
  onClearAlert,
  onRefresh,
  onChangePassword,
  onChangeEmail,
  onLogout,
  passwordLoading,
  emailLoading,
  logoutLoading,
  showContinueCard,
  nextUrl,
}) => {
  const quickLinks = useMemo<QuickLink[]>(() => {
    const baseLinks: QuickLink[] = [
      {
        title: "OAuth applications",
        description: "Register, update, and delete OAuth client credentials.",
        href: "/oauth/applications/",
        colorScheme: "purple",
      },
      {
        title: "Authorized tokens",
        description: "Review scopes and revoke issued access tokens.",
        href: "/oauth/authorized_tokens/",
        colorScheme: "blue",
      },
    ];

    if (showContinueCard && nextUrl) {
      baseLinks.push({
        title: "Return to requested page",
        description: "Continue the flow that requested authentication.",
        href: nextUrl,
        colorScheme: "teal",
      });
    }

    return baseLinks;
  }, [showContinueCard, nextUrl]);

  return (
    <Container maxW="6xl" py={{ base: 10, md: 16 }}>
      <Stack spacing={10}>
        <Box
          bgGradient="linear(to-r, purple.600, purple.400)"
          color="white"
          borderRadius="2xl"
          shadow="xl"
          p={{ base: 8, md: 12 }}
        >
          <VStack align="flex-start" spacing={3}>
            <Badge
              colorScheme="blackAlpha"
              borderRadius="full"
              px={3}
              py={1}
              fontSize="0.8rem"
            >
              Signed in
            </Badge>
            <Heading size="xl">Hi {user?.username ?? "there"} 👋</Heading>
            <Text opacity={0.9} fontSize={{ base: "md", md: "lg" }}>
              You now have a full Django session and fresh JWT tokens. Use the
              quick links below to manage OAuth clients or adjust your account
              details.
            </Text>
          </VStack>
        </Box>

        <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} spacing={6}>
          {quickLinks.map((link) => (
            <QuickLinkCard key={link.title} {...link} />
          ))}
        </SimpleGrid>

        <SettingsPanel
          user={user}
          loadingUser={loadingUser}
          alert={alert}
          onClearAlert={onClearAlert}
          onRefresh={onRefresh}
          onChangePassword={onChangePassword}
          onChangeEmail={onChangeEmail}
          onLogout={onLogout}
          passwordLoading={passwordLoading}
          emailLoading={emailLoading}
          logoutLoading={logoutLoading}
        />
      </Stack>
    </Container>
  );
};

const AuthApp: React.FC = () => {
  const [tokens, setTokens] = useState<TokenPair | null>(() =>
    loadStoredTokens()
  );
  const [user, setUser] = useState<UserInfo | null>(() => {
    if (portalContext.sessionUser) {
      return {
        username: portalContext.sessionUser.username,
        email: portalContext.sessionUser.email,
        permission: portalContext.sessionUser.permission ?? undefined,
      };
    }
    return null;
  });
  const [loadingUser, setLoadingUser] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [loginFeedback, setLoginFeedback] = useState<Feedback>(null);
  const [registerFeedback, setRegisterFeedback] = useState<Feedback>(null);
  const [settingsFeedback, setSettingsFeedback] = useState<Feedback>(null);

  const nextUrl = NEXT_URL;
  const hasJwtSession = Boolean(tokens?.access);

  const loadUserProfile = async (accessToken: string | null) => {
    if (!accessToken) {
      setUser(portalContext.sessionUser || null);
      return;
    }
    setLoadingUser(true);
    try {
      const data = await apiRequest<UserInfo>(
        endpoints.userInfo,
        "GET",
        accessToken
      );
      setUser(data);
    } catch (error) {
      setSettingsFeedback({
        type: "error",
        title: "Profile",
        message:
          error instanceof Error ? error.message : "Unable to load profile",
      });
    } finally {
      setLoadingUser(false);
    }
  };

  useEffect(() => {
    if (tokens?.access) {
      void loadUserProfile(tokens.access);
    } else {
      setUser(portalContext.sessionUser || null);
    }
  }, [tokens?.access]);

  const storeSession = (sessionTokens: TokenPair | null) => {
    setTokens(sessionTokens);
    persistTokens(sessionTokens);
  };

  const clearSession = React.useCallback(() => {
    setTokens(null);
    persistTokens(null);
    setUser(portalContext.sessionUser || null);
  }, []);

  useEffect(() => {
    if (!nextUrl) {
      return;
    }
    if (portalContext.isAuthenticated) {
      window.location.replace(nextUrl);
      return;
    }
    if (tokens?.access) {
      clearSession();
    }
  }, [nextUrl, tokens?.access, clearSession, portalContext.isAuthenticated]);

  const handleLogin = async (payload: {
    username: string;
    password: string;
  }) => {
    setLoginLoading(true);
    setLoginFeedback(null);
    try {
      const data = await apiRequest<TokenPair>(
        endpoints.login,
        "POST",
        null,
        payload
      );
      storeSession(data);
      if (NEXT_URL) {
        window.location.assign(NEXT_URL);
        return;
      }
      await loadUserProfile(data.access);
    } catch (error) {
      setLoginFeedback({
        type: "error",
        title: "Unable to log in",
        message: error instanceof Error ? error.message : "Login failed",
      });
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async (payload: {
    username: string;
    email: string;
    password: string;
  }) => {
    setRegisterLoading(true);
    setRegisterFeedback(null);
    try {
      const data = await apiRequest<TokenPair>(
        endpoints.register,
        "POST",
        null,
        payload
      );
      storeSession(data);
      if (NEXT_URL) {
        window.location.assign(NEXT_URL);
        return;
      }
      await loadUserProfile(data.access);
    } catch (error) {
      setRegisterFeedback({
        type: "error",
        title: "Unable to register",
        message: error instanceof Error ? error.message : "Registration failed",
      });
    } finally {
      setRegisterLoading(false);
    }
  };

  const handlePasswordChange = async (payload: {
    old_password: string;
    new_password: string;
  }) => {
    if (!tokens?.access) {
      setSettingsFeedback({
        type: "error",
        title: "Password update failed",
        message: "Please log in again to manage your password.",
      });
      return false;
    }
    setPasswordLoading(true);
    setSettingsFeedback(null);
    try {
      await apiRequest(
        endpoints.changePassword,
        "POST",
        tokens.access,
        payload
      );
      setSettingsFeedback({
        type: "success",
        title: "Password updated",
        message: "Your password has been changed.",
      });
      return true;
    } catch (error) {
      setSettingsFeedback({
        type: "error",
        title: "Password update failed",
        message:
          error instanceof Error ? error.message : "Unable to change password",
      });
      return false;
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleEmailChange = async (payload: { new_email: string }) => {
    if (!tokens?.access) {
      setSettingsFeedback({
        type: "error",
        title: "Email update failed",
        message: "Please log in again to manage your email address.",
      });
      return;
    }
    setEmailLoading(true);
    setSettingsFeedback(null);
    try {
      await apiRequest(endpoints.changeEmail, "POST", tokens.access, payload);
      setSettingsFeedback({
        type: "success",
        title: "Email updated",
        message: "Your email address has been changed.",
      });
      await loadUserProfile(tokens.access);
    } catch (error) {
      setSettingsFeedback({
        type: "error",
        title: "Email update failed",
        message:
          error instanceof Error ? error.message : "Unable to change email",
      });
    } finally {
      setEmailLoading(false);
    }
  };

  const handleLogout = async () => {
    setLogoutLoading(true);
    setSettingsFeedback(null);
    try {
      if (tokens?.access) {
        await apiRequest(endpoints.logout, "POST", tokens.access, {
          refresh: tokens.refresh,
        });
      }
    } catch (error) {
      setSettingsFeedback({
        type: "error",
        title: "Logout failed",
        message: error instanceof Error ? error.message : "Unable to log out",
      });
    } finally {
      setLogoutLoading(false);
      clearSession();
    }
  };

  if (hasJwtSession) {
    return (
      <SettingsExperience
        user={user}
        loadingUser={loadingUser}
        alert={settingsFeedback}
        onClearAlert={() => setSettingsFeedback(null)}
        onRefresh={() => tokens?.access && loadUserProfile(tokens.access)}
        onChangePassword={handlePasswordChange}
        onChangeEmail={handleEmailChange}
        onLogout={handleLogout}
        passwordLoading={passwordLoading}
        emailLoading={emailLoading}
        logoutLoading={logoutLoading}
        showContinueCard={Boolean(nextUrl)}
        nextUrl={nextUrl}
      />
    );
  }

  return (
    <AuthExperience
      onLogin={handleLogin}
      onRegister={handleRegister}
      loginLoading={loginLoading}
      registerLoading={registerLoading}
      loginFeedback={loginFeedback}
      registerFeedback={registerFeedback}
      clearLoginFeedback={() => setLoginFeedback(null)}
      clearRegisterFeedback={() => setRegisterFeedback(null)}
    />
  );
};

const mount = () => {
  const rootEl = document.getElementById("sso-auth-root");
  if (!rootEl) {
    return;
  }
  const root = createRoot(rootEl);
  root.render(
    <React.StrictMode>
      <ChakraProvider theme={theme}>
        <AuthApp />
      </ChakraProvider>
    </React.StrictMode>
  );
};

mount();
