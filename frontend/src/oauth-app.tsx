import React, { useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Box,
  Button,
  Container,
  Flex,
  FormControl,
  FormHelperText,
  FormLabel,
  Heading,
  HStack,
  Input,
  Link,
  List,
  ListItem,
  Stack,
  Text,
  Textarea,
  VStack,
  Badge,
  Spacer,
} from '@chakra-ui/react';
import { ChakraProvider } from '@chakra-ui/react';
import { theme } from './theme';

type HiddenField = {
  name: string;
  value?: string;
};

type ErrorPayload = {
  title: string;
  description?: string;
} | null;

type AuthorizeContext = {
  applicationName?: string;
  permissionText?: string;
  labels: {
    heading: string;
    cancel: string;
    authorize: string;
  };
  scopes?: string[];
  hiddenFields?: HiddenField[];
  csrfToken?: string;
  fieldErrors?: string[];
  nonFieldErrors?: string[];
  errorResponse: ErrorPayload;
  formAction?: string;
};

type ApplicationListContext = {
  title?: string;
  detailLabel?: string;
  applications?: Array<{ id: string | number; name: string; detailUrl: string }>;
  registerButton?: { label: string; url: string };
  emptyState?: {
    message?: string;
    ctaLabel?: string;
    ctaUrl?: string;
    ctaSuffix?: string;
  };
};

type ApplicationDetailField = {
  label: string;
  value: string;
  type: 'text' | 'textarea';
};

type ApplicationDetailContext = {
  title?: string;
  fields?: ApplicationDetailField[];
  actions?: {
    back?: { label: string; url: string };
    edit?: { label: string; url: string };
    delete?: { label: string; url: string };
  };
};

type ApplicationFormField = {
  name: string;
  label: string;
  widget: string;
  helpText?: string;
  errors?: string[];
  required?: boolean;
};

type ApplicationFormContext = {
  title?: string;
  formAction?: string;
  backUrl?: string;
  submitLabel?: string;
  cancelLabel?: string;
  csrfToken?: string;
  hiddenFields?: HiddenField[];
  fields?: ApplicationFormField[];
  nonFieldErrors?: string[];
};

type ApplicationConfirmDeleteContext = {
  heading?: string;
  formAction?: string;
  csrfToken?: string;
  labels?: {
    cancel: string;
    delete: string;
  };
  backUrl?: string;
};

type AuthorizedTokensContext = {
  title?: string;
  revokeLabel?: string;
  tokens?: Array<{
    id: string | number;
    applicationName: string;
    revokeUrl: string;
    scopes?: Array<{ name: string; description?: string }>;
  }>;
  emptyMessage?: string;
};

type AuthorizedTokenDeleteContext = {
  message?: string;
  formAction?: string;
  csrfToken?: string;
  submitLabel?: string;
};

type LogoutConfirmContext = {
  hasError?: boolean;
  error: ErrorPayload;
  applicationName?: string;
  csrfToken?: string;
  hiddenFields?: HiddenField[];
  fieldErrors?: string[];
  nonFieldErrors?: string[];
  labels: {
    headingBase: string;
    cancel: string;
    confirm: string;
  };
};

type OAuthContext =
  | AuthorizeContext
  | ApplicationListContext
  | ApplicationDetailContext
  | ApplicationFormContext
  | ApplicationConfirmDeleteContext
  | AuthorizedTokensContext
  | AuthorizedTokenDeleteContext
  | LogoutConfirmContext
  | Record<string, unknown>;

const ensureArray = <T,>(value: T[] | undefined): T[] => (Array.isArray(value) ? value : []);

const renderHiddenFields = (fields?: HiddenField[]) =>
  ensureArray(fields).map((field, index) => (
    <input
      key={`hidden-field-${index}`}
      type="hidden"
      name={field.name}
      value={field.value ?? ''}
    />
  ));

const renderErrors = (errors: string[] | undefined) => {
  if (!errors || errors.length === 0) {
    return null;
  }
  return (
    <Alert status="error" variant="subtle" borderRadius="md">
      <AlertIcon />
      <AlertDescription>
        <Stack spacing={1}>
          {errors.map((err, idx) => (
            <Text key={`error-${idx}`}>{err}</Text>
          ))}
        </Stack>
      </AlertDescription>
    </Alert>
  );
};

const combineErrors = (fieldErrors?: string[], nonFieldErrors?: string[]) => {
  const merged: string[] = [];
  if (fieldErrors) {
    merged.push(...fieldErrors);
  }
  if (nonFieldErrors) {
    merged.push(...nonFieldErrors);
  }
  return merged;
};

const AuthorizePage: React.FC<AuthorizeContext> = (props) => {
  if (props.errorResponse) {
    return (
      <Container maxW="lg" py={12}>
        <Box bg="white" borderRadius="lg" shadow="md" p={{ base: 6, md: 8 }}>
          <VStack spacing={4} align="stretch">
            <Heading size="lg" textAlign="center">
              {props.errorResponse.title}
            </Heading>
            <Text color="gray.600" textAlign="center">
              {props.errorResponse.description ?? ''}
            </Text>
          </VStack>
        </Box>
      </Container>
    );
  }

  const scopeItems = ensureArray(props.scopes);
  const combinedErrorsList = combineErrors(props.fieldErrors, props.nonFieldErrors);
  const headingText = props.applicationName
    ? `${props.labels.heading} ${props.applicationName}?`
    : props.labels.heading;

  return (
    <Container maxW="lg" py={12}>
      <Box bg="white" borderRadius="lg" shadow="md" p={{ base: 6, md: 8 }}>
        <VStack spacing={6} align="stretch">
          <Heading size="lg" textAlign="center">
            {headingText}
          </Heading>
          {props.permissionText ? (
            <Text color="gray.600" textAlign="center">
              {props.permissionText}
            </Text>
          ) : null}
          {scopeItems.length ? (
            <List spacing={2} pl={4}>
              {scopeItems.map((scope, idx) => (
                <ListItem key={`scope-${idx}`}>• {scope}</ListItem>
              ))}
            </List>
          ) : null}
          {renderErrors(combinedErrorsList)}
          <form method="post" action={props.formAction ?? ''}>
            <input type="hidden" name="csrfmiddlewaretoken" value={props.csrfToken ?? ''} />
            {renderHiddenFields(props.hiddenFields)}
            <HStack spacing={4} justify="flex-end" mt={4} flexWrap="wrap">
              <Button type="submit" variant="outline" colorScheme="gray">
                {props.labels.cancel}
              </Button>
              <Button type="submit" colorScheme="blue" name="allow">
                {props.labels.authorize}
              </Button>
            </HStack>
          </form>
        </VStack>
      </Box>
    </Container>
  );
};

const ApplicationListPage: React.FC<ApplicationListContext> = (props) => {
  const applications = ensureArray(props.applications);
  const hasApplications = applications.length > 0;

  return (
    <Container maxW="3xl" py={12}>
      <VStack align="stretch" spacing={6}>
        <Heading size="lg">{props.title ?? ''}</Heading>
        {hasApplications ? (
          <Stack spacing={4}>
            {applications.map((application) => (
              <Box
                key={application.id}
                bg="white"
                borderRadius="lg"
                shadow="sm"
                p={5}
              >
                <Flex align="center" gap={3} flexWrap="wrap">
                  <Heading size="md">{application.name || 'Unnamed application'}</Heading>
                  <Spacer />
                  <Button
                    as="a"
                    href={application.detailUrl}
                    colorScheme="blue"
                    size="sm"
                  >
                    {props.detailLabel ?? 'View'}
                  </Button>
                </Flex>
              </Box>
            ))}
          </Stack>
        ) : (
          <Box bg="white" borderRadius="lg" shadow="sm" p={5}>
            <VStack spacing={3} align="stretch">
              <Text color="gray.700">{props.emptyState?.message ?? ''}</Text>
              {props.emptyState ? (
                <Text color="gray.600">
                  <Link href={props.emptyState.ctaUrl} color="blue.500">
                    {props.emptyState.ctaLabel}
                  </Link>
                  {props.emptyState.ctaSuffix ? ` ${props.emptyState.ctaSuffix}` : ''}
                </Text>
              ) : null}
            </VStack>
          </Box>
        )}
        {props.registerButton ? (
          <Button
            as="a"
            href={props.registerButton.url}
            colorScheme="green"
            alignSelf="flex-start"
          >
            {props.registerButton.label}
          </Button>
        ) : null}
      </VStack>
    </Container>
  );
};

const ApplicationDetailPage: React.FC<ApplicationDetailContext> = (props) => {
  const fields = ensureArray(props.fields);

  return (
    <Container maxW="3xl" py={12}>
      <VStack spacing={6} align="stretch">
        <Heading size="lg">{props.title ?? ''}</Heading>
        <Box bg="white" borderRadius="lg" shadow="sm" p={{ base: 6, md: 8 }}>
          <VStack spacing={5} align="stretch">
            {fields.map((field, idx) => (
              <Box key={`detail-field-${idx}`}>
                <Text fontWeight="semibold" color="gray.700">
                  {field.label}
                </Text>
                {field.type === 'textarea' ? (
                  <Box
                    mt={1}
                    px={3}
                    py={2}
                    borderRadius="md"
                    borderWidth="1px"
                    borderColor="gray.200"
                    bg="gray.50"
                    whiteSpace="pre-wrap"
                    fontFamily="mono"
                    fontSize="sm"
                    minHeight="60px"
                  >
                    {field.value ?? ''}
                  </Box>
                ) : (
                  <Input mt={1} value={field.value ?? ''} isReadOnly />
                )}
              </Box>
            ))}
          </VStack>
        </Box>
        {props.actions ? (
          <HStack spacing={4} flexWrap="wrap">
            {props.actions.back ? (
              <Button as="a" href={props.actions.back.url} variant="outline">
                {props.actions.back.label}
              </Button>
            ) : null}
            {props.actions.edit ? (
              <Button as="a" href={props.actions.edit.url} colorScheme="blue">
                {props.actions.edit.label}
              </Button>
            ) : null}
            {props.actions.delete ? (
              <Button as="a" href={props.actions.delete.url} colorScheme="red">
                {props.actions.delete.label}
              </Button>
            ) : null}
          </HStack>
        ) : null}
      </VStack>
    </Container>
  );
};

const ApplicationFormPage: React.FC<ApplicationFormContext> = (props) => {
  const fields = ensureArray(props.fields);
  const hiddenFields = ensureArray(props.hiddenFields);
  const errors = ensureArray(props.nonFieldErrors);

  return (
    <Container maxW="3xl" py={12}>
      <Box bg="white" borderRadius="lg" shadow="md" p={{ base: 6, md: 8 }}>
        <VStack spacing={6} align="stretch">
          <Heading size="lg">{props.title ?? ''}</Heading>
          {renderErrors(errors)}
          <form method="post" action={props.formAction ?? ''}>
            <input type="hidden" name="csrfmiddlewaretoken" value={props.csrfToken ?? ''} />
            {renderHiddenFields(hiddenFields)}
            <VStack spacing={5} align="stretch">
              {fields.map((field) => (
                <FormControl
                  key={field.name}
                  isRequired={Boolean(field.required)}
                  isInvalid={Boolean(field.errors && field.errors.length)}
                >
                  <FormLabel htmlFor={field.name}>{field.label}</FormLabel>
                  <Box
                    className="chakra-form-field"
                    dangerouslySetInnerHTML={{ __html: field.widget }}
                  />
                  {field.helpText ? <FormHelperText>{field.helpText}</FormHelperText> : null}
                  {field.errors?.map((err, idx) => (
                    <Text key={`${field.name}-error-${idx}`} color="red.500" fontSize="sm" mt={1}>
                      {err}
                    </Text>
                  ))}
                </FormControl>
              ))}
            </VStack>
            <HStack spacing={4} justify="flex-end" mt={8} flexWrap="wrap">
              {props.backUrl ? (
                <Button as="a" href={props.backUrl} variant="outline">
                  {props.cancelLabel ?? 'Cancel'}
                </Button>
              ) : null}
              <Button type="submit" colorScheme="blue">
                {props.submitLabel ?? 'Save'}
              </Button>
            </HStack>
          </form>
        </VStack>
      </Box>
    </Container>
  );
};

const ApplicationConfirmDeletePage: React.FC<ApplicationConfirmDeleteContext> = (props) => (
  <Container maxW="lg" py={12}>
    <Box bg="white" borderRadius="lg" shadow="md" p={{ base: 6, md: 8 }}>
      <VStack spacing={6} align="stretch">
        <Heading size="lg" textAlign="center">
          {props.heading ?? ''}
        </Heading>
        <form method="post" action={props.formAction ?? ''}>
          <input type="hidden" name="csrfmiddlewaretoken" value={props.csrfToken ?? ''} />
          <HStack spacing={4} justify="center" mt={6} flexWrap="wrap">
            {props.backUrl ? (
              <Button as="a" href={props.backUrl} variant="outline">
                {props.labels?.cancel ?? 'Cancel'}
              </Button>
            ) : null}
            <Button type="submit" colorScheme="red" name="allow">
              {props.labels?.delete ?? 'Delete'}
            </Button>
          </HStack>
        </form>
      </VStack>
    </Box>
  </Container>
);

const AuthorizedTokensPage: React.FC<AuthorizedTokensContext> = (props) => {
  const tokens = ensureArray(props.tokens);

  if (!tokens.length) {
    return (
      <Container maxW="3xl" py={12}>
        <VStack spacing={6} align="stretch">
          <Heading size="lg">{props.title ?? ''}</Heading>
          <Box bg="white" borderRadius="lg" shadow="sm" p={{ base: 6, md: 8 }}>
            <Text color="gray.600">{props.emptyMessage ?? ''}</Text>
          </Box>
        </VStack>
      </Container>
    );
  }

  return (
    <Container maxW="3xl" py={12}>
      <VStack spacing={6} align="stretch">
        <Heading size="lg">{props.title ?? ''}</Heading>
        {tokens.map((token) => (
          <Box
            key={token.id}
            bg="white"
            borderRadius="lg"
            shadow="sm"
            p={{ base: 5, md: 6 }}
          >
            <Flex align="center" gap={3} flexWrap="wrap">
              <Text fontWeight="semibold">{token.applicationName}</Text>
              <Spacer />
              <Button as="a" href={token.revokeUrl} colorScheme="red" size="sm">
                {props.revokeLabel ?? 'Revoke'}
              </Button>
            </Flex>
            {token.scopes && token.scopes.length ? (
              <Stack spacing={2} mt={4}>
                {token.scopes.map((scope, idx) => (
                  <Badge
                    key={`scope-${token.id}-${idx}`}
                    colorScheme="purple"
                    width="fit-content"
                  >
                    {scope.name}
                    {scope.description ? `: ${scope.description}` : ''}
                  </Badge>
                ))}
              </Stack>
            ) : null}
          </Box>
        ))}
      </VStack>
    </Container>
  );
};

const AuthorizedTokenDeletePage: React.FC<AuthorizedTokenDeleteContext> = (props) => (
  <Container maxW="lg" py={12}>
    <Box bg="white" borderRadius="lg" shadow="md" p={{ base: 6, md: 8 }}>
      <VStack spacing={6} align="stretch" textAlign="center">
        <Text fontSize="lg" color="gray.700">
          {props.message ?? ''}
        </Text>
        <form method="post" action={props.formAction ?? ''}>
          <input type="hidden" name="csrfmiddlewaretoken" value={props.csrfToken ?? ''} />
          <Button type="submit" colorScheme="red">
            {props.submitLabel ?? 'Delete'}
          </Button>
        </form>
      </VStack>
    </Box>
  </Container>
);

const LogoutConfirmPage: React.FC<LogoutConfirmContext> = (props) => {
  if (props.hasError && props.error) {
    return (
      <Container maxW="lg" py={12}>
        <Box bg="white" borderRadius="lg" shadow="md" p={{ base: 6, md: 8 }}>
          <VStack spacing={4} align="stretch">
            <Heading size="lg" textAlign="center">
              {props.error.title}
            </Heading>
            <Text color="gray.600" textAlign="center">
              {props.error.description ?? ''}
            </Text>
          </VStack>
        </Box>
      </Container>
    );
  }

  const headingText = props.applicationName
    ? `${props.labels.headingBase} requested by ${props.applicationName}`
    : props.labels.headingBase;
  const combinedErrorsList = combineErrors(props.fieldErrors, props.nonFieldErrors);

  return (
    <Container maxW="lg" py={12}>
      <Box bg="white" borderRadius="lg" shadow="md" p={{ base: 6, md: 8 }}>
        <VStack spacing={6} align="stretch">
          <Heading size="lg" textAlign="center">
            {headingText}
          </Heading>
          {renderErrors(combinedErrorsList)}
          <form method="post" action="">
            <input type="hidden" name="csrfmiddlewaretoken" value={props.csrfToken ?? ''} />
            {renderHiddenFields(props.hiddenFields)}
            <HStack spacing={4} justify="center" mt={4} flexWrap="wrap">
              <Button type="submit" variant="outline" colorScheme="gray">
                {props.labels.cancel}
              </Button>
              <Button type="submit" colorScheme="blue" name="allow">
                {props.labels.confirm}
              </Button>
            </HStack>
          </form>
        </VStack>
      </Box>
    </Container>
  );
};

const componentMap: Record<string, React.FC<any>> = {
  authorize: AuthorizePage,
  application_list: ApplicationListPage,
  application_detail: ApplicationDetailPage,
  application_form: ApplicationFormPage,
  application_confirm_delete: ApplicationConfirmDeletePage,
  authorized_tokens: AuthorizedTokensPage,
  authorized_token_delete: AuthorizedTokenDeletePage,
  logout_confirm: LogoutConfirmPage,
};

const mount = () => {
  const rootEl = document.getElementById('oauth-root');
  if (!rootEl) {
    return;
  }
  const pageKey = rootEl.dataset.page ?? '';
  const Component = componentMap[pageKey];

  if (!Component) {
    console.warn('No OAuth component registered for page', pageKey);
    return;
  }

  const script = document.getElementById('oauth-context');
  let context: OAuthContext = {};
  if (script) {
    try {
      context = JSON.parse(script.textContent || '{}') as OAuthContext;
    } catch (error) {
      console.error('Failed to parse OAuth context payload', error);
    }
  }

  const root = createRoot(rootEl);
  root.render(
    <React.StrictMode>
      <ChakraProvider theme={theme}>
        <Component {...context} />
      </ChakraProvider>
    </React.StrictMode>,
  );
};

mount();

