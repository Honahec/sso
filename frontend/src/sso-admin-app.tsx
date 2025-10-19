import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Box,
  Button,
  ChakraProvider,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  Input,
  Select,
  Spinner,
  Stack,
  Switch,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useToast,
} from "@chakra-ui/react";
import { theme } from "./theme";

type PermissionInfo = {
  admin_user: boolean;
  create_applications: boolean;
};

type AdminUser = {
  id: number;
  username: string;
  email: string;
  is_active: boolean;
  permission: PermissionInfo | null;
};

type AdminContext = {
  sessionUser?: {
    id: number;
    username: string;
    email: string;
    permission: PermissionInfo;
  } | null;
};

const loadAdminContext = (): AdminContext => {
  const script = document.getElementById("sso-admin-context");
  if (!script) {
    return {};
  }
  try {
    return JSON.parse(script.textContent || "{}") as AdminContext;
  } catch (error) {
    console.error("Unable to parse admin context", error);
    return {};
  }
};

const context = loadAdminContext();

const CSRF_COOKIE_NAME = "csrftoken";

const safeHttpMethod = (method: string) =>
  ["GET", "HEAD", "OPTIONS", "TRACE"].includes(method.toUpperCase());

const getCookie = (name: string): string | null => {
  const cookies = document.cookie ? document.cookie.split(";") : [];
  for (const cookie of cookies) {
    const trimmed = cookie.trim();
    if (trimmed.startsWith(`${name}=`)) {
      return decodeURIComponent(trimmed.substring(name.length + 1));
    }
  }
  return null;
};

const fetchJSON = async <T,>(
  url: string,
  init: RequestInit = {}
): Promise<T> => {
  const headers = new Headers(init.headers || undefined);

  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  const method = (init.method || "GET").toUpperCase();
  const hasBody = init.body !== undefined;
  if (hasBody && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (!safeHttpMethod(method)) {
    const csrf = getCookie(CSRF_COOKIE_NAME);
    if (csrf && !headers.has("X-CSRFToken")) {
      headers.set("X-CSRFToken", csrf);
    }
  }

  const response = await fetch(url, {
    credentials: "same-origin",
    ...init,
    headers,
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = data?.detail || response.statusText;
    throw new Error(message || "Request failed");
  }

  return data as T;
};

const AdminApp: React.FC = () => {
  const toast = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<number | "new" | null>(null);
  const [formState, setFormState] = useState({
    username: "",
    email: "",
    password: "",
    is_active: true,
    admin_user: false,
    create_applications: false,
  });

  const loadUsers = async (query = "") => {
    setLoading(true);
    try {
      const data = await fetchJSON<{ results: AdminUser[] }>(
        `/admin/users/${query ? `?search=${encodeURIComponent(query)}` : ""}`
      );
      setUsers(data.results);
    } catch (error) {
      toast({
        title: "Failed to load users",
        status: "error",
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  const resetForm = () => {
    setSelectedUser(null);
    setFormState({
      username: "",
      email: "",
      password: "",
      is_active: true,
      admin_user: false,
      create_applications: false,
    });
  };

  const selectExistingUser = (user: AdminUser) => {
    setSelectedUser(user.id);
    setFormState({
      username: user.username,
      email: user.email,
      password: "",
      is_active: user.is_active,
      admin_user: Boolean(user.permission?.admin_user),
      create_applications: Boolean(user.permission?.create_applications),
    });
  };

  const handleSearch = async (event: React.FormEvent) => {
    event.preventDefault();
    await loadUsers(search.trim());
  };

  const handleCreate = () => {
    setSelectedUser("new");
    setFormState({
      username: "",
      email: "",
      password: "",
      is_active: true,
      admin_user: false,
      create_applications: false,
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      if (selectedUser === "new") {
        const payload = {
          username: formState.username.trim(),
          email: formState.email.trim(),
          password: formState.password,
          admin_user: formState.admin_user,
          create_applications: formState.create_applications,
        };
        await fetchJSON<AdminUser>("/admin/users/", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast({ title: "User created", status: "success" });
      } else if (typeof selectedUser === "number") {
        const payload = {
          email: formState.email.trim(),
          is_active: formState.is_active,
          permission: {
            admin_user: formState.admin_user,
            create_applications: formState.create_applications,
          },
        };
        await fetchJSON<AdminUser>(`/admin/users/${selectedUser}/`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        toast({ title: "User updated", status: "success" });
      }

      await loadUsers(search.trim());
      resetForm();
    } catch (error) {
      toast({
        title: "Save failed",
        status: "error",
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setSaving(false);
    }
  };

  const selectedUserLabel = useMemo(() => {
    if (selectedUser === "new") {
      return "Create new user";
    }
    const user = users.find((u) => u.id === selectedUser);
    if (!user) {
      return "Select a user";
    }
    return `Edit ${user.username}`;
  }, [selectedUser, users]);

  return (
    <Stack
      direction={{ base: "column", lg: "row" }}
      spacing={8}
      p={{ base: 6, md: 10 }}
    >
      <Box flex="2" bg="white" p={6} borderRadius="lg" shadow="md">
        <Flex
          justify="space-between"
          align="center"
          mb={6}
          flexWrap="wrap"
          gap={4}
        >
          <Heading size="lg">Manage User</Heading>
          <Button colorScheme="purple" onClick={handleCreate}>
            Create User
          </Button>
        </Flex>

        <Box as="form" onSubmit={handleSearch} mb={4}>
          <HStack spacing={3} align="stretch">
            <Input
              placeholder="Search by username or email"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <Button type="submit" colorScheme="purple">
              Search
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setSearch("");
                void loadUsers("");
              }}
            >
              Reset
            </Button>
          </HStack>
        </Box>

        {loading ? (
          <Flex justify="center" py={10}>
            <Spinner size="lg" />
          </Flex>
        ) : (
          <Box overflowX="auto">
            <Table size="sm">
              <Thead>
                <Tr>
                  <Th>ID</Th>
                  <Th>Username</Th>
                  <Th>Email</Th>
                  <Th>Status</Th>
                  <Th>Admin</Th>
                  <Th>Create OAuth Applications</Th>
                  <Th></Th>
                </Tr>
              </Thead>
              <Tbody>
                {users.map((user) => (
                  <Tr key={user.id}>
                    <Td>{user.id}</Td>
                    <Td>{user.username}</Td>
                    <Td>{user.email}</Td>
                    <Td>{user.is_active ? "Active" : "Inactive"}</Td>
                    <Td>{user.permission?.admin_user ? "Yes" : "No"}</Td>
                    <Td>
                      {user.permission?.create_applications ? "Yes" : "No"}
                    </Td>
                    <Td textAlign="right">
                      <Button
                        size="sm"
                        onClick={() => selectExistingUser(user)}
                      >
                        Edit
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
            {users.length === 0 ? (
              <Text textAlign="center" color="gray.500" mt={6}>
                No users found.
              </Text>
            ) : null}
          </Box>
        )}
      </Box>

      <Box flex="1" bg="white" p={6} borderRadius="lg" shadow="md">
        <Heading size="md" mb={4}>
          {selectedUserLabel}
        </Heading>
        <form onSubmit={handleSubmit}>
          <Stack spacing={4}>
            <FormControl isRequired={selectedUser === "new"}>
              <FormLabel>Username</FormLabel>
              <Input
                value={formState.username}
                onChange={(event) =>
                  setFormState({ ...formState, username: event.target.value })
                }
                isReadOnly={typeof selectedUser === "number"}
              />
            </FormControl>
            <FormControl isRequired>
              <FormLabel>Email</FormLabel>
              <Input
                type="email"
                value={formState.email}
                onChange={(event) =>
                  setFormState({ ...formState, email: event.target.value })
                }
              />
            </FormControl>

            {selectedUser === "new" ? (
              <FormControl isRequired>
                <FormLabel>Initial Password</FormLabel>
                <Input
                  type="password"
                  value={formState.password}
                  onChange={(event) =>
                    setFormState({ ...formState, password: event.target.value })
                  }
                />
              </FormControl>
            ) : null}

            {typeof selectedUser === "number" ? (
              <Flex align="center" justify="space-between">
                <FormLabel mb={0}>Active</FormLabel>
                <Switch
                  isChecked={formState.is_active}
                  onChange={(event) =>
                    setFormState({
                      ...formState,
                      is_active: event.target.checked,
                    })
                  }
                />
              </Flex>
            ) : null}

            <Flex align="center" justify="space-between">
              <FormLabel mb={0}>Portal Admin</FormLabel>
              <Switch
                isChecked={formState.admin_user}
                onChange={(event) =>
                  setFormState({
                    ...formState,
                    admin_user: event.target.checked,
                  })
                }
              />
            </Flex>

            <Flex align="center" justify="space-between">
              <FormLabel mb={0}>Create OAuth Applications</FormLabel>
              <Switch
                isChecked={formState.create_applications}
                onChange={(event) =>
                  setFormState({
                    ...formState,
                    create_applications: event.target.checked,
                  })
                }
              />
            </Flex>

            <HStack justify="flex-end" pt={2}>
              <Button variant="ghost" onClick={resetForm}>
                Cancel
              </Button>
              <Button colorScheme="purple" type="submit" isLoading={saving}>
                Save
              </Button>
            </HStack>
          </Stack>
        </form>
      </Box>
    </Stack>
  );
};

const mount = () => {
  const rootEl = document.getElementById("sso-admin-root");
  if (!rootEl) {
    return;
  }
  const root = createRoot(rootEl);
  root.render(
    <React.StrictMode>
      <ChakraProvider theme={theme}>
        <AdminApp />
      </ChakraProvider>
    </React.StrictMode>
  );
};

mount();
