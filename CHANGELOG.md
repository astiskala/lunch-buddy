# [1.3.0](https://github.com/astiskala/lunch-buddy/compare/v1.2.0...v1.3.0) (2025-10-19)


### Features

* Refactor codebase to use modern TypeScript features ([59e7c64](https://github.com/astiskala/lunch-buddy/commit/59e7c644e350cc3c92ebbc9a12522bee257613de))
* update TypeScript code for improved type safety and consistency ([b7159c2](https://github.com/astiskala/lunch-buddy/commit/b7159c2e730646c0f24d0d29a56714de91f4c6b1))

# [1.2.0](https://github.com/astiskala/lunch-buddy/compare/v1.1.0...v1.2.0) (2025-10-19)


### Bug Fixes

* swap @semantic-release/exec and @semantic-release/npm configurations in .releaserc.json ([f524388](https://github.com/astiskala/lunch-buddy/commit/f524388181665c743c423eceee1b317abf3178dc))


### Features

* enhance budget status calculations and add recurring income handling ([655a09c](https://github.com/astiskala/lunch-buddy/commit/655a09c2e9f555a707053161bb85c1f4e5b2a1d1))

# [1.1.0](https://github.com/astiskala/lunch-buddy/compare/v1.0.0...v1.1.0) (2025-10-19)


### Features

* enhance budget tracking for income categories and update CI paths ([25a130a](https://github.com/astiskala/lunch-buddy/commit/25a130a2b4c8936adbfe3cc02dc73747280b88a7))

# 1.0.0 (2025-10-19)


### Bug Fixes

* add missing closing brace in manifest.webmanifest ([dfc97dd](https://github.com/astiskala/lunch-buddy/commit/dfc97ddd99c0217f3395bbb253981665e1368934))
* correct screenshot sizes and add missing SVG icon in manifest.webmanifest ([e6b5a42](https://github.com/astiskala/lunch-buddy/commit/e6b5a42b84674aa46fba998b04f4fa373b919a8f))
* **deps:** remove @moodboom/git-semver dependency from package.json and package-lock.json ([95b5d56](https://github.com/astiskala/lunch-buddy/commit/95b5d56f6c3531d07b2413a66fb9d2db0d97ecac))
* **env:** remove hardcoded API base URL from runtime environment ([37b0f90](https://github.com/astiskala/lunch-buddy/commit/37b0f90e8bf441f3f9be72563c9b33171e801818))
* **login:** strengthen API key validation ([4d7d669](https://github.com/astiskala/lunch-buddy/commit/4d7d669917134ef41fab84d1de6cd0f0c9438b2a))
* **login:** strengthen API key validation ([e30ca5d](https://github.com/astiskala/lunch-buddy/commit/e30ca5d7c7883436e3738de68b564fdd1ed31d86))
* **login:** strengthen API key validation and fix trim regression ([a6d0ff1](https://github.com/astiskala/lunch-buddy/commit/a6d0ff123ce13d8019fdeb69e3d7698e4e09c7f0))
* reorder properties in manifest.webmanifest for improved readability ([bb1566f](https://github.com/astiskala/lunch-buddy/commit/bb1566f976bb3dbb69a829ce617d74047bebd74a))
* resolve PWA hanging on splash screen ([322561d](https://github.com/astiskala/lunch-buddy/commit/322561d0ceeba8996f1f5d1ee81d0c7f08ebf2cc))
* resolve PWA hanging on splash screen ([57bf75c](https://github.com/astiskala/lunch-buddy/commit/57bf75cb537a1efa2d101f3b4c73c4e7142c5909))
* resolve PWA hanging on splash screen ([fdc50c4](https://github.com/astiskala/lunch-buddy/commit/fdc50c40c0291c2d2b0223084c5961c09ee29463))
* update ChromeHeadless browser option for unit tests to include NoSandbox ([7128da7](https://github.com/astiskala/lunch-buddy/commit/7128da7bd2ce0c16922bcb6b37fb3a6ddd986590))
* update display settings in manifest for better PWA experience ([9c71de1](https://github.com/astiskala/lunch-buddy/commit/9c71de1fc52de54521ff6794281556a4c03e9ce8))
* update Permissions-Policy for improved security compliance ([08f2449](https://github.com/astiskala/lunch-buddy/commit/08f244984a3d5a010fb936dd13551db7e6d99c61))
* update rewrites and headers in Vercel configuration for improved routing and manifest handling ([8e6799a](https://github.com/astiskala/lunch-buddy/commit/8e6799a60312075e5f437f5ec67b1238368b2453))
* update service worker fetch handling and change asset install mode to prefetch ([5eb87e5](https://github.com/astiskala/lunch-buddy/commit/5eb87e55d445f96cebc1bc4fb2049191c09dcac5))
* update service worker registration strategy for immediate registration ([278ce5b](https://github.com/astiskala/lunch-buddy/commit/278ce5bb59295219ebd9dd885b0247a0ce80b05d))
* **versioning:** Integrate versioning into the build process ([163abc4](https://github.com/astiskala/lunch-buddy/commit/163abc4e1a84f2f348a7ab7328b11234a52de3ba))


### Features

* add CI workflow and style linting commands; update README and package.json ([b8842bb](https://github.com/astiskala/lunch-buddy/commit/b8842bb875113485c3a2f3a2a3eb008b782f6c23))
* add display_override property to manifest.webmanifest for improved display options ([529fd3f](https://github.com/astiskala/lunch-buddy/commit/529fd3f0ca45721586ea2ea433bc48ee28ab14b9))
* add error handling for transaction loading with retry option and offline indication ([375d553](https://github.com/astiskala/lunch-buddy/commit/375d5539144668db52a40aa45649a7495641859f))
* add includeAllTransactions option for category transactions and preferences ([f0f36ee](https://github.com/astiskala/lunch-buddy/commit/f0f36eed6c616e7cfcbe6695854900d093ce2500))
* add offline support with dedicated offline page and update service worker configuration ([d1d11bd](https://github.com/astiskala/lunch-buddy/commit/d1d11bded4aa29eba6674f320a6ce0b75e230834))
* add runtime environment configuration for LunchMoney API base URL ([e11311c](https://github.com/astiskala/lunch-buddy/commit/e11311c325b3ba7fd90f741da67a97110daae481))
* add security headers to netlify.toml for enhanced application security ([7d6a46e](https://github.com/astiskala/lunch-buddy/commit/7d6a46e6dc5d19ac55c106f3b4fad948109add58))
* add stylelint for SCSS linting and fix styles across components ([dcc48df](https://github.com/astiskala/lunch-buddy/commit/dcc48df98dd2ef4730712ffbba5a2b38cd0993ac))
* add summary hero component styles and update login page with logo ([79c1cd2](https://github.com/astiskala/lunch-buddy/commit/79c1cd20b68d89bfce41fac76c51f91618e9f634))
* add unit tests for CategoryProgressListComponent, DashboardPageComponent, and Text Utils ([fc1f103](https://github.com/astiskala/lunch-buddy/commit/fc1f1035be95171115c4979f1d95b9ad73f73630))
* **ci:** add release job with semantic-release configuration ([6997c33](https://github.com/astiskala/lunch-buddy/commit/6997c33c1f6e8aaa45edb5e372d65b0d08fbc0da))
* **deps:** add @semantic-release/exec package for enhanced release automation ([4c53a1a](https://github.com/astiskala/lunch-buddy/commit/4c53a1a5daf2307b46062f5518ec7e67335d7b9b))
* enhance application routing and authentication handling ([4f7e5d9](https://github.com/astiskala/lunch-buddy/commit/4f7e5d95469dc024610d750a5406eb4da4b301f9))
* enhance offline mode with improved caching strategies and service worker updates ([34a8b99](https://github.com/astiskala/lunch-buddy/commit/34a8b99ebfd517514dd9977e2784d49b4d429263))
* enhance recurring expenses handling with reference date support and add related tests ([081d81f](https://github.com/astiskala/lunch-buddy/commit/081d81f171fc61bab8b2f37671b59c4759e7002b))
* enhance secure storage service with timeout handling and fallback for encryption ([69995fd](https://github.com/astiskala/lunch-buddy/commit/69995fdc5de2dd16e8c321ae005c0fe3f4393635))
* Enhance segmented control styles and update button toggle classes for better UI consistency ([e4b37ef](https://github.com/astiskala/lunch-buddy/commit/e4b37efecc32fb17a07012fd3ea805eafd977617))
* implement caching for budget data and recurring expenses in BudgetService ([9526904](https://github.com/astiskala/lunch-buddy/commit/9526904fb14d4590f57c9c9903b9b02b4170dd4f))
* implement collapse functionality for category card details on click ([3d9b294](https://github.com/astiskala/lunch-buddy/commit/3d9b2943a3f00e576235774cf76370b92c467300))
* implement environment variable handling for Lunch Money API key and update interceptor ([6e8c146](https://github.com/astiskala/lunch-buddy/commit/6e8c146d0abacfe2f4541a52da0fe26b7a2f3ce0))
* implement offline mode with service worker caching and offline indicator ([467b96e](https://github.com/astiskala/lunch-buddy/commit/467b96e07853aafe5a20afa8f373537edf892fb3))
* implement secure storage for API keys and update related services and components ([4c8c65f](https://github.com/astiskala/lunch-buddy/commit/4c8c65f6c2ea218c3d87c9a40cac2b6695d2394f))
* Implement SummaryHeroComponent for budget summary display ([891bcd0](https://github.com/astiskala/lunch-buddy/commit/891bcd0a0f253665cd8ed82e5e5a5b2ce6ad7336))
* integrate LoggerService for improved error handling across services ([e0bbf19](https://github.com/astiskala/lunch-buddy/commit/e0bbf19ba29943c3d3744bdd43d4eb03e18f1dc5))
* integrate push notification service for budget alerts and enhance related components and tests ([99c57db](https://github.com/astiskala/lunch-buddy/commit/99c57dbf07f9768f0743ba9b920dc3328bbd5cae))
* migrate deployment from Netlify to Vercel and update related configurations ([52be4fc](https://github.com/astiskala/lunch-buddy/commit/52be4fc8c9ce2b56a8b452e2755821c15626b361))
* refactor authentication handling and remove secure storage service ([ea40414](https://github.com/astiskala/lunch-buddy/commit/ea40414f16dfacbbbadfc7bd2f953025d420950c))
* refactor expense and income calculations for improved readability and performance ([60112e9](https://github.com/astiskala/lunch-buddy/commit/60112e96be2128ab9cdba75b92250f07a7eab50b))
* **release:** Implement semantic-release for automated versioning ([216e043](https://github.com/astiskala/lunch-buddy/commit/216e0431153ac08d0cb91c74d82f97a2f74a3d36))
* update configuration and metadata files for improved application setup and user experience ([6a93f27](https://github.com/astiskala/lunch-buddy/commit/6a93f2738a7ec297258ef73d5cbb262794274911))
* update Content-Security-Policy in netlify.toml and improve HTML entity decoding in text.util.ts ([9674b45](https://github.com/astiskala/lunch-buddy/commit/9674b451a75446b03dbae661b1a1c96a1e75fd43))
* update Content-Security-Policy in netlify.toml to enhance security ([61cecff](https://github.com/astiskala/lunch-buddy/commit/61cecff7c679af6022390db1fa6cfc8aed754a68))
* Update icons and manifest colors; enhance dashboard UI ([d905596](https://github.com/astiskala/lunch-buddy/commit/d905596491c648ea1c4646365f408a56d009bbd8))
* update security headers in netlify.toml and remove unused styles from components ([279b292](https://github.com/astiskala/lunch-buddy/commit/279b29251af7276a459feda947a7ee76e9353822))
* update SummaryHeroComponent to correctly calculate remaining expenses and income, and enhance tests for new functionality ([0084351](https://github.com/astiskala/lunch-buddy/commit/0084351a9e941a73ce156add4e6b91ed353cb8c2))
* **versioning:** Add automated versioning and display in settings ([584581d](https://github.com/astiskala/lunch-buddy/commit/584581dd23010b0fe2c53cee24b5d001bc5f1ae5))
