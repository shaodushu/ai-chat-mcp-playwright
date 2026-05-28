/**
 * DOM element location utilities.
 * Primary + fallback selector resolution strategy.
 */

async function tryPrimaryLocator(page, primary) {
  if (!primary) return null;
  try {
    let locator = null;
    switch (primary.type) {
    case 'text':
      locator = page.getByText(primary.value);
      break;
    case 'role':
      locator = page.getByRole(primary.value, primary.options || {});
      break;
    case 'label':
      locator = page.getByLabel(primary.value);
      break;
    case 'placeholder':
      locator = page.getByPlaceholder(primary.value);
      break;
    case 'testId':
      locator = page.getByTestId(primary.value);
      break;
    default:
      locator = page.locator(primary.value);
    }
    if (locator && await locator.isVisible({ timeout: 2000 }).catch(() => false)) {
      return locator;
    }
  } catch (e) {
    // fall through
  }
  return null;
}

async function tryFallbackSelectors(page, fallbacks, firstOnly = true) {
  if (!fallbacks) return firstOnly ? null : [];
  for (const selector of fallbacks) {
    try {
      if (firstOnly) {
        const locator = page.locator(selector).first();
        if (await locator.isVisible({ timeout: 2000 }).catch(() => false)) {
          return locator;
        }
      } else {
        const locator = page.locator(selector);
        const count = await locator.count().catch(() => 0);
        if (count > 0) {
          const results = [];
          for (let i = 0; i < count; i++) {
            results.push(locator.nth(i));
          }
          return results;
        }
      }
    } catch (e) {
      // try next
    }
  }
  return firstOnly ? null : [];
}

/**
 * Find a single visible element by primary + fallback selectors.
 */
export async function locateElement(page, selectorConfig) {
  const { primary, fallback = [] } = selectorConfig;

  const primaryResult = await tryPrimaryLocator(page, primary);
  if (primaryResult) return primaryResult;

  return tryFallbackSelectors(page, fallback, true);
}

/**
 * Find all matching visible elements by primary + fallback selectors.
 */
export async function locateAllElements(page, selectorConfig) {
  const { primary, fallback = [] } = selectorConfig;

  if (primary) {
    try {
      let locator = null;
      switch (primary.type) {
      case 'text':
        locator = page.getByText(primary.value);
        break;
      case 'role':
        locator = page.getByRole(primary.value, primary.options || {});
        break;
      case 'label':
        locator = page.getByLabel(primary.value);
        break;
      case 'placeholder':
        locator = page.getByPlaceholder(primary.value);
        break;
      default:
        locator = page.locator(primary.value);
      }

      const count = await locator.count().catch(() => 0);
      if (count > 0) {
        const results = [];
        for (let i = 0; i < count; i++) {
          results.push(locator.nth(i));
        }
        return results;
      }
    } catch (e) {
      // fall through
    }
  }

  const fallbackResult = await tryFallbackSelectors(page, fallback, false);
  if (Array.isArray(fallbackResult)) return fallbackResult;
  return [];
}

/**
 * Check if an element is visible on the page.
 */
export async function isElementVisible(page, selectorConfig, timeout = 2000) {
  const locator = await locateElement(page, selectorConfig);
  if (!locator) return false;
  return locator.isVisible({ timeout }).catch(() => false);
}
