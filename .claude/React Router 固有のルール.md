# React Router の実装ルール

## ルーティング

### Basic Routes

The filename maps to the route's URL pathname, except for `_index.tsx` which is the index route for the root route. You can use `.js`, `.jsx`, `.ts` or `.tsx` file extensions.

```text lines=[3-4]
app/
├── routes/
│   ├── _index.tsx
│   └── about.tsx
└── root.tsx
```

| URL      | Matched Routes          |
| -------- | ----------------------- |
| `/`      | `app/routes/_index.tsx` |
| `/about` | `app/routes/about.tsx`  |

Note that these routes will be rendered in the outlet of `app/root.tsx` because of nested routing.

### Dot Delimiters

Adding a `.` to a route filename will create a `/` in the URL.

```text lines=[5-7]
 app/
├── routes/
│   ├── _index.tsx
│   ├── about.tsx
│   ├── concerts.trending.tsx
│   ├── concerts.salt-lake-city.tsx
│   └── concerts.san-diego.tsx
└── root.tsx
```

| URL                        | Matched Route                            |
| -------------------------- | ---------------------------------------- |
| `/`                        | `app/routes/_index.tsx`                  |
| `/about`                   | `app/routes/about.tsx`                   |
| `/concerts/trending`       | `app/routes/concerts.trending.tsx`       |
| `/concerts/salt-lake-city` | `app/routes/concerts.salt-lake-city.tsx` |
| `/concerts/san-diego`      | `app/routes/concerts.san-diego.tsx`      |

The dot delimiter also creates nesting, see the nesting section for more information.

### Dynamic Segments

Usually your URLs aren't static but data-driven. Dynamic segments allow you to match segments of the URL and use that value in your code. You create them with the `$` prefix.

```text lines=[5]
 app/
├── routes/
│   ├── _index.tsx
│   ├── about.tsx
│   ├── concerts.$city.tsx
│   └── concerts.trending.tsx
└── root.tsx
```

| URL                        | Matched Route                      |
| -------------------------- | ---------------------------------- |
| `/`                        | `app/routes/_index.tsx`            |
| `/about`                   | `app/routes/about.tsx`             |
| `/concerts/trending`       | `app/routes/concerts.trending.tsx` |
| `/concerts/salt-lake-city` | `app/routes/concerts.$city.tsx`    |
| `/concerts/san-diego`      | `app/routes/concerts.$city.tsx`    |

The value will be parsed from the URL and passed to various APIs. We call these values "URL Parameters". The most useful places to access the URL params are in loaders and actions.

```tsx
export async function serverLoader({ params }) {
  return fakeDb.getAllConcertsForCity(params.city)
}
```

You'll note the property name on the `params` object maps directly to the name of your file: `$city.tsx` becomes `params.city`.

Routes can have multiple dynamic segments, like `concerts.$city.$date`, both are accessed on the params object by name:

```tsx
export async function serverLoader({ params }) {
  return fake.db.getConcerts({
    date: params.date,
    city: params.city,
  })
}
```

See the routing guide for more information.

### Nested Routes

Nested Routing is the general idea of coupling segments of the URL to component hierarchy and data. You can read more about it in the Routing Guide.

You create nested routes with dot delimiters. If the filename before the `.` matches another route filename, it automatically becomes a child route to the matching parent. Consider these routes:

```text lines=[5-8]
 app/
├── routes/
│   ├── _index.tsx
│   ├── about.tsx
│   ├── concerts._index.tsx
│   ├── concerts.$city.tsx
│   ├── concerts.trending.tsx
│   └── concerts.tsx
└── root.tsx
```

All the routes that start with `app/routes/concerts.` will be child routes of `app/routes/concerts.tsx` and render inside the parent route's outlet nested_routing.

| URL                        | Matched Route                      | Layout                    |
| -------------------------- | ---------------------------------- | ------------------------- |
| `/`                        | `app/routes/_index.tsx`            | `app/root.tsx`            |
| `/about`                   | `app/routes/about.tsx`             | `app/root.tsx`            |
| `/concerts`                | `app/routes/concerts._index.tsx`   | `app/routes/concerts.tsx` |
| `/concerts/trending`       | `app/routes/concerts.trending.tsx` | `app/routes/concerts.tsx` |
| `/concerts/salt-lake-city` | `app/routes/concerts.$city.tsx`    | `app/routes/concerts.tsx` |

Note you typically want to add an index route when you add nested routes so that something renders inside the parent's outlet when users visit the parent URL directly.

For example, if the URL is `/concerts/salt-lake-city` then the UI hierarchy will look like this:

```tsx
<Root>
  <Concerts>
    <City />
  </Concerts>
</Root>
```

### Nested URLs without Layout Nesting

Sometimes you want the URL to be nested, but you don't want the automatic layout nesting. You can opt out of nesting with a trailing underscore on the parent segment:

```text lines=[8]
 app/
├── routes/
│   ├── _index.tsx
│   ├── about.tsx
│   ├── concerts.$city.tsx
│   ├── concerts.trending.tsx
│   ├── concerts.tsx
│   └── concerts_.mine.tsx
└── root.tsx
```

| URL                        | Matched Route                      | Layout                    |
| -------------------------- | ---------------------------------- | ------------------------- |
| `/`                        | `app/routes/_index.tsx`            | `app/root.tsx`            |
| `/about`                   | `app/routes/about.tsx`             | `app/root.tsx`            |
| `/concerts/mine`           | `app/routes/concerts_.mine.tsx`    | `app/root.tsx`            |
| `/concerts/trending`       | `app/routes/concerts.trending.tsx` | `app/routes/concerts.tsx` |
| `/concerts/salt-lake-city` | `app/routes/concerts.$city.tsx`    | `app/routes/concerts.tsx` |

Note that `/concerts/mine` does not nest with `app/routes/concerts.tsx` anymore, but `app/root.tsx`. The `trailing_` underscore creates a path segment, but it does not create layout nesting.

Think of the `trailing_` underscore as the long bit at the end of your parent's signature, writing you out of the will, removing the segment that follows from the layout nesting.

### Nested Layouts without Nested URLs

We call these <a name="pathless-routes"><b>Pathless Routes</b></a>

Sometimes you want to share a layout with a group of routes without adding any path segments to the URL. A common example is a set of authentication routes that have a different header/footer than the public pages or the logged in app experience. You can do this with a `_leading` underscore.

```text lines=[3-5]
 app/
├── routes/
│   ├── _auth.login.tsx
│   ├── _auth.register.tsx
│   ├── _auth.tsx
│   ├── _index.tsx
│   ├── concerts.$city.tsx
│   └── concerts.tsx
└── root.tsx
```

| URL                        | Matched Route                   | Layout                    |
| -------------------------- | ------------------------------- | ------------------------- |
| `/`                        | `app/routes/_index.tsx`         | `app/root.tsx`            |
| `/login`                   | `app/routes/_auth.login.tsx`    | `app/routes/_auth.tsx`    |
| `/register`                | `app/routes/_auth.register.tsx` | `app/routes/_auth.tsx`    |
| `/concerts`                | `app/routes/concerts.tsx`       | `app/routes/concerts.tsx` |
| `/concerts/salt-lake-city` | `app/routes/concerts.$city.tsx` | `app/routes/concerts.tsx` |

Think of the `_leading` underscore as a blanket you're pulling over the filename, hiding the filename from the URL.

### Optional Segments

Wrapping a route segment in parentheses will make the segment optional.

```text lines=[3-5]
 app/
├── routes/
│   ├── ($lang)._index.tsx
│   ├── ($lang).$productId.tsx
│   └── ($lang).categories.tsx
└── root.tsx
```

| URL                        | Matched Route                       |
| -------------------------- | ----------------------------------- |
| `/`                        | `app/routes/($lang)._index.tsx`     |
| `/categories`              | `app/routes/($lang).categories.tsx` |
| `/en/categories`           | `app/routes/($lang).categories.tsx` |
| `/fr/categories`           | `app/routes/($lang).categories.tsx` |
| `/american-flag-speedo`    | `app/routes/($lang)._index.tsx`     |
| `/en/american-flag-speedo` | `app/routes/($lang).$productId.tsx` |
| `/fr/american-flag-speedo` | `app/routes/($lang).$productId.tsx` |

You may wonder why `/american-flag-speedo` is matching the `($lang)._index.tsx` route instead of `($lang).$productId.tsx`. This is because when you have an optional dynamic param segment followed by another dynamic param, it cannot reliably be determined if a single-segment URL such as `/american-flag-speedo` should match `/:lang` `/:productId`. Optional segments match eagerly and thus it will match `/:lang`. If you have this type of setup it's recommended to look at `params.lang` in the `($lang)._index.tsx` loader and redirect to `/:lang/american-flag-speedo` for the current/default language if `params.lang` is not a valid language code.

### Splat Routes

While dynamic segments match a single path segment (the stuff between two `/` in a URL), a splat route will match the rest of a URL, including the slashes.

```text lines=[4,6]
 app/
├── routes/
│   ├── _index.tsx
│   ├── $.tsx
│   ├── about.tsx
│   └── files.$.tsx
└── root.tsx
```

| URL                                          | Matched Route            |
| -------------------------------------------- | ------------------------ |
| `/`                                          | `app/routes/_index.tsx`  |
| `/about`                                     | `app/routes/about.tsx`   |
| `/beef/and/cheese`                           | `app/routes/$.tsx`       |
| `/files`                                     | `app/routes/files.$.tsx` |
| `/files/talks/react-conf_old.pdf`            | `app/routes/files.$.tsx` |
| `/files/talks/react-conf_final.pdf`          | `app/routes/files.$.tsx` |
| `/files/talks/react-conf-FINAL-MAY_2024.pdf` | `app/routes/files.$.tsx` |

Similar to dynamic route parameters, you can access the value of the matched path on the splat route's `params` with the `"*"` key.

```tsx filename=app/routes/files.$.tsx
export async function serverLoader({ params }) {
  const filePath = params['*']
  return fake.getFileInfo(filePath)
}
```

### Escaping Special Characters

If you want one of the special characters used for these route conventions to actually be a part of the URL, you can escape the conventions with `[]` characters. This can be especially helpful for resource routes that include an extension in the URL.

| Filename                            | URL                 |
| ----------------------------------- | ------------------- |
| `app/routes/sitemap[.]xml.tsx`      | `/sitemap.xml`      |
| `app/routes/[sitemap.xml].tsx`      | `/sitemap.xml`      |
| `app/routes/weird-url.[_index].tsx` | `/weird-url/_index` |
| `app/routes/dolla-bills-[$].tsx`    | `/dolla-bills-$`    |
| `app/routes/[[so-weird]].tsx`       | `/[so-weird]`       |
| `app/routes/reports.$id[.pdf].ts`   | `/reports/123.pdf`  |

### Folders for Organization

Routes can also be folders with a `route.tsx` file inside defining the route module. The rest of the files in the folder will not become routes. This allows you to organize your code closer to the routes that use them instead of repeating the feature names across other folders.

The files inside a folder have no meaning for the route paths, the route path is completely defined by the folder name.

Consider these routes:

```text
 app/
├── routes/
│   ├── _landing._index.tsx
│   ├── _landing.about.tsx
│   ├── _landing.tsx
│   ├── app._index.tsx
│   ├── app.projects.tsx
│   ├── app.tsx
│   └── app_.projects.$id.roadmap.tsx
└── root.tsx
```

Some, or all of them can be folders holding their own `route` module inside.

```text
app/
├── routes/
│   ├── _landing._index/
│   │   ├── route.tsx
│   │   └── scroll-experience.tsx
│   ├── _landing.about/
│   │   ├── employee-profile-card.tsx
│   │   ├── get-employee-data.server.ts
│   │   ├── route.tsx
│   │   └── team-photo.jpg
│   ├── _landing/
│   │   ├── footer.tsx
│   │   ├── header.tsx
│   │   └── route.tsx
│   ├── app._index/
│   │   ├── route.tsx
│   │   └── stats.tsx
│   ├── app.projects/
│   │   ├── get-projects.server.ts
│   │   ├── project-buttons.tsx
│   │   ├── project-card.tsx
│   │   └── route.tsx
│   ├── app/
│   │   ├── footer.tsx
│   │   ├── primary-nav.tsx
│   │   └── route.tsx
│   ├── app_.projects.$id.roadmap/
│   │   ├── chart.tsx
│   │   ├── route.tsx
│   │   └── update-timeline.server.ts
│   └── contact-us.tsx
└── root.tsx
```

## 自動生成の型

`app/routes` に配置したコンポーネントで利用される `loader`、`action` の引数の型である `Route.LoaderArgs`、`Route.ActionArgs` は `.react-router/types/app/routes/+types/[file_name].ts` 配下に自動生成される。
型は alias により以下のように import できる。

```ts
import type { Route } from './+types/[file_name]'
```

型の自動生成のタイミングは `npx react-router typegen` コマンドの実効時か、`npm run dev` でのプログラム実行時です。
そのためこの自動生成型を利用する場合は実装時点では型が存在せず typescript はエラーを出力しますが、型の自動生成のタイミングでこのエラーは解消されるため無視してください。

## テストの Stub の作成

コンポーネントの import で下記のように React Router のモジュールが読み込まれている場合は `createRoutesStub` を利用してUIテスト用のレンダリングをおこなう。必要でない限り `vi.mock()` を利用した `react-router` モジュールのモックは不要。

```ts
// React Router モジュールの読み込みがあるコンポーネント
import { fetcher, some_react_router_module } from 'react-router'

// 基本的に関数のスパイのためのモックが必要にならない限り以下のようなモックは不要
vi.mock('react-router' /** React Router 環境で利用されるオブジェクトのモック */)
```

### ログインフォームをテストする例

```ts
// ログインフォーム
import { useActionData } from "react-router";

export function LoginForm() {
  const { errors } = useActionData();
  return (
    <Form method="post">
      <label>
        <input type="text" name="username" />
        {errors?.username && <div>{errors.username}</div>}
      </label>

      <label>
        <input type="password" name="password" />
        {errors?.password && <div>{errors.password}</div>}
      </label>

      <button type="submit">Login</button>
    </Form>
  );
}
```

```ts
// ログインフォームのテスト
import { createRoutesStub } from "react-router";
import {
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginForm } from "./LoginForm";

test("LoginForm renders error messages", async () => {
  const USER_MESSAGE = "Username is required";
  const PASSWORD_MESSAGE = "Password is required";

  const Stub = createRoutesStub([
    {
      path: "/login",
      Component: LoginForm,
      action() {
        return {
          errors: {
            username: USER_MESSAGE,
            password: PASSWORD_MESSAGE,
          },
        };
      },
    },
  ]);

  // render the app stub at "/login"
  render(<Stub initialEntries={["/login"]} />);

  // simulate interactions
  userEvent.click(screen.getByText("Login"));
  await waitFor(() => screen.findByText(USER_MESSAGE));
  await waitFor(() => screen.findByText(PASSWORD_MESSAGE));
});
```

### createRoutesStub のリファレンス

- createRoutesStub(routes, context?): ((\_\_namedParameters: RoutesTestStubProps) => Element)
- Parameters
  - routes: StubRouteObject[]
  - context: AppLoadContext = {}

- Returns ((\_\_namedParameters: RoutesTestStubProps) => Element)
  - (\_\_namedParameters): Element
  - Parameters
    - \_\_namedParameters: RoutesTestStubProps
  - Returns Element

### Interface RoutesTestStubProps

```ts
interface RoutesTestStubProps {
  future?: Partial<FutureConfig>
  hydrationData?: Partial<Pick<RouterState, 'loaderData' | 'actionData' | 'errors'>>
  initialEntries?: InitialEntry[]
  initialIndex?: number
}
```

- Properties
  - future?: Partial\<FutureConfig>
    - Future flags mimicking the settings in react-router.config.ts
  - hydrationData?: Partial<Pick<RouterState, "loaderData" | "actionData" | "errors">>
    - Used to set the route's initial loader and action data. e.g. hydrationData={{ loaderData: { "/contact": { locale: "en-US" } }, actionData: { "/login": { errors: { email: "invalid email" } }} }}
  - initialEntries?: InitialEntry[]
    - The initial entries in the history stack. This allows you to start a test with multiple locations already in the history stack (for testing a back navigation, etc.) The test will default to the last entry in initialEntries if no initialIndex is provided. e.g. initialEntries={["/home", "/about", "/contact"]}
  - initialIndex?: number
    - The initial index in the history stack to render. This allows you to start a test at a specific entry. It defaults to the last entry in initialEntries. e.g. initialEntries: ["/", "/events/123"] initialIndex: 1 // start at "/events/123"

### React Router オブジェクトをモックする場合

関数のスパイなどでReact Routerのモックが必要になった場合は、以下のように`vi.importActual`を用いて`react-router`オブジェクト全体をロードしてから当該のメソッドやコンポーネントをモックする。

```ts
// useSubmitのモック
const mockSubmit = vi.fn()
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router')
  return {
    ...actual,
    useSubmit: () => mockSubmit,
  }
})

// Formのモック
const mockSubmit = vi.fn()
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router')
  return {
    ...actual,
    Form: ({ children, onSubmit, ...props }: { children: React.ReactNode; onSubmit?: () => void }) => (
      <form
        {...props}
        onSubmit={(e) => {
          mockSubmit()
          e.preventDefault()
          if (onSubmit) onSubmit()
        }}
      >
        {children}
      </form>
    ),
  }
})
```
