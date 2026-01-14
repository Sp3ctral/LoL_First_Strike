This markdown file describes the architecture, decisions, and features that involve the First Strike Web App. AI was partially used in order to aid in the explanation of topics and for clarity and organization.

## Table of Contents

1. Overview
2. Architecture
3. Backend (Express.js)
4. Frontend (Angular 21)
5. Authentication Flow
6. RxJS Subscriptions & Reactive Patterns
7. Angular 21 Features Used

---

## Overview

**LoL First Strike** is a full-stack web application that provides League of Legends information exclusively to Twitch subscribers of a specific streamer. The app uses:

- **Frontend**: Angular 21 (zoneless, standalone components)
- **Backend**: Express.js with Twitch OAuth2 authentication
- **Authentication**: Twitch OAuth2 flow with subscription verification

---

## Architecture

```
LoL_First_Strike/
├── client/                    # Angular 21 Frontend
│   └── src/
│       ├── app/
│       │   ├── guards/        # Route guards
│       │   ├── layout/        # Header, Footer components
│       │   ├── pages/         # Page components (Landing)
│       │   ├── services/      # AuthService
│       │   └── ui/            # Reusable UI components
│       └── environments/      # Environment configs
└── server/                    # Express.js Backend
    └── server.js              # Main server file
```

### Path Aliases

Defined in tsconfig.json:

| Alias | Path |
|-------|------|
| `@environments/*` | `environments/*` |
| `@layout/*` | `app/layout/*` |
| `@ui/*` | `app/ui/*` |
| `@services/*` | `app/services/*` |
| `@guards/*` | `app/guards/*` |
| `@pages/*` | `app/pages/*` |

---

## Backend (Express.js)

The backend is located in server.js and handles Twitch OAuth2 authentication and subscription verification.

### Dependencies

From package.json:

- `express` - Web framework
- `axios` - HTTP client for Twitch API calls
- `cors` - Cross-origin resource sharing
- `cookie-parser` - Signed cookie handling
- `helmet` - Security headers
- `express-rate-limit` - Rate limiting
- `dotenv` - Environment variables

### Security Middleware

```javascript
// Helmet for security headers
app.use(helmet());

// Rate limiting - General API (100 requests per 15 minutes)
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
});

// Rate limiting - Auth endpoints (10 requests per 15 minutes)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
});
```

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/twitch` | GET | Initiates Twitch OAuth2 flow |
| `/auth/twitch/callback` | GET | Handles OAuth2 callback from Twitch |
| `/auth/session` | GET | Checks if user has valid subscription cookie |
| `/auth/logout` | POST | Clears subscription cookie |

### Cookie Configuration

```javascript
const getCookieOptions = () => ({
    httpOnly: true,      // Not accessible via JavaScript
    signed: true,        // Cryptographically signed
    secure: IS_PRODUCTION, // HTTPS only in production
    sameSite: 'lax',     // CSRF protection
    maxAge: 24 * 60 * 60 * 1000  // 24 hours
});
```

---

## Frontend (Angular 21)

### Application Bootstrap

The app bootstraps in main.ts:

```typescript
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
```

### Application Configuration

app.config.ts configures the application:

```typescript
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),  // Angular 21 global error handling
    provideZonelessChangeDetection(),       // Angular 21 zoneless mode
    provideRouter(routes),
    provideHttpClient(withFetch())          // Modern fetch-based HTTP client
  ]
};
```

**Key Angular 21 Features:**

- **`provideZonelessChangeDetection()`**: Removes Zone.js dependency, requiring explicit change detection via signals
- **`provideBrowserGlobalErrorListeners()`**: New in Angular 21 for global error handling
- **`withFetch()`**: Uses the Fetch API instead of XMLHttpRequest

### Root Component

app.ts:

```typescript
@Component({
    selector: 'app-root',
    imports: [RouterOutlet, Header, Footer],  // Standalone imports
    templateUrl: './app.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class App {
    private authService = inject(AuthService);

    constructor() {
        // Check session on app initialization
        this.authService.checkSession()
            .pipe(takeUntilDestroyed())
            .subscribe();
    }
}
```

The template in app.html:

```html
<app-header />
<main>
  <router-outlet />
</main>
<app-footer />
```

### Routing

app.routes.ts defines lazy-loaded routes:

```typescript
export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('@pages/landing/landing').then(m => m.Landing)
  },
  {
    path: '**',
    redirectTo: ''
  }
];
```

**Lazy Loading**: The `loadComponent` function dynamically imports components only when the route is accessed, reducing initial bundle size.

---

## Authentication Flow

### Complete OAuth2 Flow Diagram

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Angular   │     │   Express   │     │   Twitch    │     │  Twitch API │
│   Client    │     │   Backend   │     │   OAuth     │     │             │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │                   │
       │ 1. Click Login    │                   │                   │
       ├──────────────────►│                   │                   │
       │                   │                   │                   │
       │ 2. Redirect to Twitch                 │                   │
       │◄──────────────────┤                   │                   │
       │                   │                   │                   │
       │ 3. User authorizes app                │                   │
       ├───────────────────────────────────────►                   │
       │                   │                   │                   │
       │ 4. Redirect with code                 │                   │
       │◄──────────────────────────────────────┤                   │
       │                   │                   │                   │
       │ 5. Code to backend                    │                   │
       ├──────────────────►│                   │                   │
       │                   │                   │                   │
       │                   │ 6. Exchange code for token            │
       │                   ├───────────────────────────────────────►
       │                   │                   │                   │
       │                   │ 7. Get user ID    │                   │
       │                   ├───────────────────────────────────────►
       │                   │                   │                   │
       │                   │ 8. Check subscription                 │
       │                   ├───────────────────────────────────────►
       │                   │                   │                   │
       │ 9. Set cookie & redirect              │                   │
       │◄──────────────────┤                   │                   │
       │                   │                   │                   │
```

### AuthService

auth.service.ts:

```typescript
@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private router = inject(Router);
    private http = inject(HttpClient);
    
    // Private writable signal
    private _isSubscribed = signal<boolean | undefined>(undefined);
    
    // Public readonly signals
    readonly isSubscribed = this._isSubscribed.asReadonly();
    readonly hasAccess = computed(() => this._isSubscribed() === true);
    readonly isLoading = computed(() => this._isSubscribed() === undefined);
    
    private readonly API_URL = environment.apiUrl;
```

**Signal States:**

| `_isSubscribed` Value | `hasAccess()` | `isLoading()` |
|-----------------------|---------------|---------------|
| `undefined` | `false` | `true` |
| `true` | `true` | `false` |
| `false` | `false` | `false` |

### Session Check Method

```typescript
checkSession() {
    return this.http.get<{ subscribed: boolean }>(
        `${this.API_URL}/auth/session`,
        { withCredentials: true }  // Sends cookies
    ).pipe(
        tap(response => this._isSubscribed.set(response.subscribed)),
        catchError(error => {
            console.error('Session check failed:', error);
            this._isSubscribed.set(false);
            return of({ subscribed: false });
        })
    );
}
```

**Important**: `withCredentials: true` is required to send the signed cookie to the backend.

### Route Guard

auth.guard.ts:

```typescript
export const AuthGuard: CanActivateFn = () => {
    const authService = inject(AuthService);
    const router = inject(Router);
    
    // Convert signal to observable, wait for loading to complete
    return toObservable(authService.isLoading).pipe(
        filter(isLoading => !isLoading),  // Wait until not loading
        take(1),                           // Complete after first emission
        map(() => {
            if (authService.hasAccess()) {
                return true;
            }
            return router.parseUrl('/');   // Redirect to home
        })
    );
};
```

**Key Pattern**: `toObservable()` bridges Angular signals to RxJS, allowing the guard to wait for the async session check to complete.

---

## RxJS Subscriptions & Reactive Patterns

### Subscription Management with `takeUntilDestroyed()`

Angular 21 provides `takeUntilDestroyed()` from `@angular/core/rxjs-interop` to automatically unsubscribe when a component is destroyed.

**In Constructor (no injection context needed):**

```typescript
// client/src/app/app.ts
constructor() {
    this.authService.checkSession()
        .pipe(takeUntilDestroyed())  // Auto-unsubscribes on destroy
        .subscribe();
}
```

**Outside Constructor (requires DestroyRef):**

```typescript
// client/src/app/layout/header/header.ts
private destroyRef = inject(DestroyRef);

logout() {
    this.authService.logout()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe();
}
```

### Why This Matters

Without proper unsubscription, observables can:
1. **Cause memory leaks** - Subscriptions hold references
2. **Trigger unnecessary side effects** - Callbacks fire after component destruction
3. **Create zombie subscriptions** - Multiple subscriptions pile up

### RxJS Operators Used

| Operator | Location | Purpose |
|----------|----------|---------|
| `tap()` | AuthService | Side effects (setting signals) |
| `catchError()` | AuthService | Error handling with fallback |
| `of()` | AuthService | Create observable from value |
| `filter()` | AuthGuard | Wait for loading to complete |
| `take(1)` | AuthGuard | Complete after first emission |
| `map()` | AuthGuard | Transform value to route decision |
| `toObservable()` | AuthGuard | Convert signal to observable |

---

## Angular 21 Features Used

### 1. Zoneless Change Detection

Configured in app.config.ts:

```typescript
provideZonelessChangeDetection()
```

**Impact**: Zone.js is not included, reducing bundle size. Change detection only runs when:
- Signals are updated
- `ChangeDetectorRef.markForCheck()` is called
- Async pipe emits

### 2. Signals

AuthService uses signals for reactive state:

```typescript
private _isSubscribed = signal<boolean | undefined>(undefined);
readonly isSubscribed = this._isSubscribed.asReadonly();
readonly hasAccess = computed(() => this._isSubscribed() === true);
readonly isLoading = computed(() => this._isSubscribed() === undefined);
```

**Benefits:**
- Fine-grained reactivity
- No Zone.js required
- Better performance than BehaviorSubject for simple state

### 3. `input()` Function for Component Inputs

Button component:

```typescript
// Modern signal-based inputs (Angular 17+)
href = input<string>();
variant = input<'primary' | 'secondary' | 'outline'>('outline');
size = input<'small' | 'medium' | 'large'>('medium');
disabled = input<boolean>(false);
```

**Compared to decorator approach:**
```typescript
// Old approach (still works but less preferred)
@Input() href?: string;
@Input() variant: 'primary' | 'secondary' | 'outline' = 'outline';
```

### 4. `computed()` for Derived State

Button component:

```typescript
buttonClasses = computed(() => {
    return `btn btn--${this.variant()} btn--${this.size()} ${this.disabled() ? 'btn--disabled' : ''}`.trim();
});
```

**Benefits:**
- Automatically recalculates when dependencies change
- Memoized - only recalculates when inputs change
- Works with zoneless change detection

### 5. Control Flow Syntax (`@if`, `@else`, `@for`)

Landing page:

```html
@if (isLoading()) {
    <h1>Loading...</h1>
} @else if (hasAccess()) {
    <h1>Welcome, Subscriber! 🎉</h1>
} @else {
    <h1>Welcome to First Strike</h1>
}
```

**Replaces:**
```html
<!-- Old approach -->
<h1 *ngIf="isLoading(); else checkAccess">Loading...</h1>
<ng-template #checkAccess>
    <h1 *ngIf="hasAccess(); else noAccess">Welcome!</h1>
</ng-template>
```

### 6. Standalone Components

All components use standalone architecture (no NgModules):

```typescript
@Component({
    selector: 'app-header',
    imports: [Button, BlinkingIndicator, NgIcon],  // Direct imports
    templateUrl: './header.html',
})
export class Header { }
```

### 7. `inject()` Function

Modern dependency injection pattern:

```typescript
// Modern approach (preferred)
private authService = inject(AuthService);
private router = inject(Router);

// Compared to constructor injection
constructor(
    private authService: AuthService,
    private router: Router
) { }
```

### 8. Host Binding with `host` Property

Button component:

```typescript
@Component({
    // ...
    host: {
        '[style.display]': '"contents"'
    }
})
```

BlinkingIndicator component:

```typescript
@Component({
    // ...
    host: { 
        '[class]': 'indicatorClasses()'
    }
})
```

### 9. `ChangeDetectionStrategy.OnPush`

All components use OnPush for optimal performance:

```typescript
@Component({
    changeDetection: ChangeDetectionStrategy.OnPush
})
```

**With zoneless mode**: OnPush is the expected default behavior.

---

## UI Components

### Button Component

button.ts

**Features:**
- Supports internal Angular routes (`routerLink`)
- Supports external links (`href` with `target="_blank"`)
- Supports regular buttons (form submission)
- Variants: `primary`, `secondary`, `outline`
- Sizes: `small`, `medium`, `large`

**Template Pattern** (button.html):

```html
<ng-template #content>
  <ng-content />
</ng-template>

@if (href(); as link) {
  @if (link.substring(0, 4) === "http") {
    <a [attr.href]="link" target="_blank" rel="noopener noreferrer">
      <ng-container *ngTemplateOutlet="content" />
    </a>
  } @else {
    <a [routerLink]="link">
      <ng-container *ngTemplateOutlet="content" />
    </a>
  }
} @else {
  <button [disabled]="disabled()">
    <ng-container *ngTemplateOutlet="content" />
  </button>
}
```

**Why `ng-template` pattern?** Angular's `<ng-content>` can only project content once. The template pattern allows the same projected content to be used in multiple conditional branches.

### BlinkingIndicator Component

blinking-indicator.ts

Displays a live/offline status indicator with CSS animation:

```typescript
@Component({
    host: { 
        '[class]': 'indicatorClasses()'  // Dynamic host classes
    }
})
export class BlinkingIndicator {
    size = input<'small' | 'medium' | 'large'>('medium');
    isLive = input<boolean>(false);

    indicatorClasses = computed(() => 
        `${this.isLive() ? "live" : "offline"} ${this.size()}`.trim()
    );
}
```

---

## Environment Configuration

### Development

environment.development.ts:

```typescript
export const environment = {
    production: false,
    apiUrl: 'http://localhost:3000'
};
```

### Production

environment.ts:

```typescript
export const environment = {
    production: true,
    apiUrl: 'https://your-production-api.com'
};
```

### File Replacement

Configured in angular.json:

```json
"fileReplacements": [
    {
        "replace": "src/environments/environment.ts",
        "with": "src/environments/environment.development.ts"
    }
]
```

---

## Testing

Tests use Vitest (configured in tsconfig.spec.json):

```json
{
    "compilerOptions": {
        "types": ["vitest/globals"]
    }
}
```

### Test Example

app.spec.ts:

```typescript
describe('App', () => {
    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [App],
            providers: [
                provideHttpClient(),
                provideRouter([])
            ]
        }).compileComponents();
    });

    it('should create the app', () => {
        const fixture = TestBed.createComponent(App);
        expect(fixture.componentInstance).toBeTruthy();
    });
});
```

---

## Running the Application

### Backend

```bash
cd server
npm install
npm start  # Or: node server.js
```

### Frontend

```bash
cd client
npm install
npm start  # Or: ng serve
```

Access at `http://localhost:4200`

---

## Summary

This application demonstrates modern Angular 21 patterns:

1. **Zoneless architecture** with signal-based reactivity
2. **Standalone components** without NgModules
3. **Functional route guards** with `CanActivateFn`
4. **Signal-based inputs** with `input()` function
5. **Computed properties** for derived state
6. **Modern control flow** with `@if`/`@else`
7. **Proper subscription management** with `takeUntilDestroyed()`
8. **OAuth2 authentication** with secure cookie handling