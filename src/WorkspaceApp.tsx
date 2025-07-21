import { useState, useEffect } from 'react';
import { Isoflow } from 'fossflow';
import { flattenCollections } from '@isoflow/isopacks/dist/utils';
import isoflowIsopack from '@isoflow/isopacks/dist/isoflow';
import awsIsopack from '@isoflow/isopacks/dist/aws';
import gcpIsopack from '@isoflow/isopacks/dist/gcp';
import azureIsopack from '@isoflow/isopacks/dist/azure';
import kubernetesIsopack from '@isoflow/isopacks/dist/kubernetes';
import { DiagramData } from './diagramUtils';
import './App.css';

const icons = flattenCollections([
  isoflowIsopack,
  awsIsopack,
  azureIsopack,
  gcpIsopack,
  kubernetesIsopack
]);

function WorkspaceApp() {
  const [diagramData, setDiagramData] = useState<DiagramData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load the workspace.json file from public directory
    fetch('/workspace.json')
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to load workspace.json: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        console.log('Loaded workspace data:', data);

        // Combine items and connectors into a single items array for Isoflow
        const allItems = [
          ...(data.items || []),
          ...(data.connectors || [])
        ];

        // Merge the loaded data with our icons
        const diagramWithIcons: DiagramData = {
          title: data.title || 'Workspace Diagram',
          icons: icons, // Always use full icon set
          colors: data.colors || [],
          items: allItems,
          views: data.views || [],
          fitToScreen: data.fitToScreen !== false
        };
        console.log('Processed diagram data:', diagramWithIcons);
        setDiagramData(diagramWithIcons);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading workspace.json:', err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // Set default tool to pan mode and hide menu items after component mounts
  useEffect(() => {
    if (!loading && diagramData) {
      // Function to hide menu items by text content
      const hideMenuItems = () => {
        const menuItemsToHide = ['Undo', 'Redo', 'Open', 'Export as JSON', 'Export as image', 'Clear the canvas'];
        const menuItemsToKeep = ['GitHub', 'Discord', 'Isoflow'];

        // Find all elements that might contain menu text
        const allElements = document.querySelectorAll('*');

        allElements.forEach(element => {
          const textContent = element.textContent?.trim();

          // Only proceed if this element contains text we want to hide
          if (textContent && menuItemsToHide.includes(textContent)) {
            // Make sure we're not hiding elements that should be kept
            const shouldKeep = menuItemsToKeep.some(keepItem =>
              textContent.includes(keepItem) ||
              element.innerHTML.includes(keepItem)
            );

            if (!shouldKeep) {
              // Find the closest menu item container (but be more precise)
              let currentElement = element as HTMLElement;
              let foundMenuItemContainer = false;

              // Look for the immediate menu item container (max 3 levels up)
              for (let i = 0; i < 3 && !foundMenuItemContainer; i++) {
                // Check if this looks like a menu item container
                if (currentElement.tagName === 'LI' ||
                  currentElement.className.includes('menu-item') ||
                  currentElement.className.includes('dropdown-item') ||
                  (currentElement.parentElement &&
                    currentElement.parentElement.tagName === 'UL' &&
                    currentElement.tagName === 'DIV')) {

                  // Double-check this isn't a container for GitHub/Discord
                  const containerText = currentElement.textContent?.trim();
                  const shouldKeepContainer = menuItemsToKeep.some(keepItem =>
                    containerText?.includes(keepItem)
                  );

                  if (!shouldKeepContainer) {
                    currentElement.remove(); // Remove instead of hide
                    foundMenuItemContainer = true;
                    console.log(`Removed menu item container: ${textContent}`);
                  }
                } else if (currentElement.parentElement) {
                  currentElement = currentElement.parentElement;
                } else {
                  break;
                }
              }

              // If no container found, remove just the element itself
              if (!foundMenuItemContainer) {
                (element as HTMLElement).remove(); // Remove instead of hide
                console.log(`Removed menu item element: ${textContent}`);
              }
            }
          }
        });

        // After removing menu items, remove separators only from hamburger menu
        const removeSeparators = () => {
          // More targeted approach - only remove HR elements that are in the hamburger menu
          const allHRs = document.querySelectorAll('hr');
          allHRs.forEach((hr) => {
            // Check if this HR is specifically in a hamburger menu context
            let currentElement = hr.parentElement;
            let isInHamburgerMenu = false;

            // Look for specific hamburger menu indicators
            for (let i = 0; i < 3 && currentElement; i++) {
              const className = currentElement.className || '';
              const id = currentElement.id || '';

              // Look for hamburger menu specific classes/IDs
              if (className.includes('hamburger') ||
                className.includes('menu-dropdown') ||
                className.includes('popover') ||
                id.includes('menu') ||
                (currentElement.tagName === 'UL' && currentElement.children.length <= 5)) { // Small menu
                isInHamburgerMenu = true;
                break;
              }
              currentElement = currentElement.parentElement;
            }

            if (isInHamburgerMenu) {
              hr.remove();
              console.log('Removed hamburger menu separator');
            }
          });
        };

        // Call separator removal multiple times to catch dynamic content
        removeSeparators();
        setTimeout(removeSeparators, 500);
        setTimeout(removeSeparators, 1500);

        // Function to remove vertical separators next to toolbar buttons
        const removeVerticalSeparators = () => {
          // Look for any vertical lines or separators near the pan button
          const allElements = document.querySelectorAll('*');
          allElements.forEach(element => {
            const computedStyle = window.getComputedStyle(element);
            const rect = element.getBoundingClientRect();

            // Check if this element looks like a vertical separator
            if (rect.width <= 2 && rect.height > 10 &&
              (computedStyle.backgroundColor !== 'rgba(0, 0, 0, 0)' ||
                computedStyle.borderLeftWidth !== '0px' ||
                computedStyle.borderRightWidth !== '0px')) {

              // Check if it's near the top-left area where the pan button would be
              if (rect.left < 200 && rect.top < 200) {
                (element as HTMLElement).remove();
                console.log('Removed vertical separator near pan button');
              }
            }
          });

          // Also specifically target common separator patterns
          const separatorSelectors = [
            'div[style*="width: 1px"]',
            'div[style*="width:1px"]',
            'div[style*="border-left"]',
            'div[style*="border-right"]',
            '.vertical-divider',
            '.toolbar-divider',
            '[class*="separator"]'
          ];

          separatorSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
              const rect = el.getBoundingClientRect();
              if (rect.left < 200 && rect.top < 200 && rect.width <= 2) {
                el.remove();
                console.log(`Removed vertical separator: ${selector}`);
              }
            });
          });
        };

        // Call vertical separator removal multiple times
        setTimeout(removeVerticalSeparators, 1000);
        setTimeout(removeVerticalSeparators, 2000);
        setTimeout(removeVerticalSeparators, 3000);

        // Nuclear approach: Remove any element that could be the vertical line
        const nuclearVerticalLineRemoval = () => {
          // Get all elements and check their computed styles
          const allElements = Array.from(document.querySelectorAll('*'));

          allElements.forEach(element => {
            const rect = element.getBoundingClientRect();
            const computedStyle = window.getComputedStyle(element);

            // Check if this element looks like a vertical line
            if (rect.width <= 3 && rect.height > 5 &&
              rect.left < 300 && rect.top < 300) { // In the top-left area

              // Check if it has properties that make it look like a separator
              const hasBackground = computedStyle.backgroundColor !== 'rgba(0, 0, 0, 0)' &&
                computedStyle.backgroundColor !== 'transparent';
              const hasBorder = computedStyle.borderLeftWidth !== '0px' ||
                computedStyle.borderRightWidth !== '0px';
              const hasOpacity = parseFloat(computedStyle.opacity) > 0;

              if ((hasBackground || hasBorder) && hasOpacity) {
                console.log('Removing potential vertical separator:', {
                  element: element.tagName,
                  className: element.className,
                  width: rect.width,
                  height: rect.height,
                  left: rect.left,
                  top: rect.top,
                  backgroundColor: computedStyle.backgroundColor,
                  borderLeft: computedStyle.borderLeftWidth,
                  borderRight: computedStyle.borderRightWidth
                });

                element.remove();
              }
            }
          });
        };

        // Call nuclear removal multiple times with longer delays
        setTimeout(nuclearVerticalLineRemoval, 2000);
        setTimeout(nuclearVerticalLineRemoval, 4000);
        setTimeout(nuclearVerticalLineRemoval, 6000);

        // Ultra-aggressive approach: Continuously scan for and remove the vertical line
        const continuousVerticalLineRemoval = () => {
          const allElements = document.querySelectorAll('*');
          allElements.forEach(element => {
            const rect = element.getBoundingClientRect();
            const computedStyle = window.getComputedStyle(element);

            // Very specific targeting for elements that look like the vertical line next to pan button
            if (rect.width <= 2 && rect.height > 15 &&
              rect.left > 40 && rect.left < 80 && // Right next to where pan button would be
              rect.top > 10 && rect.top < 100) {  // In the top area

              const hasVisibleBackground = computedStyle.backgroundColor !== 'rgba(0, 0, 0, 0)' &&
                computedStyle.backgroundColor !== 'transparent';
              const hasVisibleBorder = computedStyle.borderLeftWidth !== '0px' ||
                computedStyle.borderRightWidth !== '0px';

              if (hasVisibleBackground || hasVisibleBorder) {
                console.log('FOUND AND REMOVING vertical line:', {
                  element: element.tagName,
                  className: element.className,
                  width: rect.width,
                  height: rect.height,
                  left: rect.left,
                  top: rect.top,
                  backgroundColor: computedStyle.backgroundColor,
                  borderLeft: computedStyle.borderLeftWidth,
                  borderRight: computedStyle.borderRightWidth
                });
                element.remove();
              }
            }
          });
        };

        // Run continuously every 1 second
        const verticalLineInterval = setInterval(continuousVerticalLineRemoval, 1000);

        // Also run immediately and with delays
        continuousVerticalLineRemoval();
        setTimeout(continuousVerticalLineRemoval, 500);
        setTimeout(continuousVerticalLineRemoval, 1500);
        setTimeout(continuousVerticalLineRemoval, 3000);
        setTimeout(continuousVerticalLineRemoval, 5000);

        // Final desperate attempt: Remove ANY element that could possibly be that line
        const desperateLineRemoval = () => {
          // Target any element that's thin and vertical in the top area
          document.querySelectorAll('*').forEach(el => {
            const rect = el.getBoundingClientRect();
            if (rect.width <= 3 && rect.height > 10 && rect.top < 150 && rect.left < 150) {
              console.log('DESPERATE REMOVAL:', el.tagName, el.className, rect);
              el.remove();
            }
          });
        };

        // Run desperate removal multiple times
        setTimeout(desperateLineRemoval, 3000);
        setTimeout(desperateLineRemoval, 5000);
        setTimeout(desperateLineRemoval, 7000);

        // Function to replace the Isoflow version text with custom text
        const replaceVersionText = () => {
          // Find all elements that might contain the version text
          const allElements = document.querySelectorAll('*');
          allElements.forEach(element => {
            const textContent = element.textContent?.trim();

            // Look for the Isoflow version text - but only if it's the EXACT text, not contained in larger text
            if (textContent && textContent === 'Isoflow v1.0.4') {
              // Replace the text content
              element.textContent = '(PhoenixNet-Labs) - View Only';
              console.log('Replaced Isoflow version text with PhoenixNet-Labs, View Only');
            }
          });
        };

        // Call version text replacement multiple times to catch dynamic content
        setTimeout(replaceVersionText, 1000);
        setTimeout(replaceVersionText, 2000);
        setTimeout(replaceVersionText, 3000);
        setTimeout(replaceVersionText, 5000);

        // Function to disable right-click context menu
        const disableRightClick = () => {
          // Disable right-click on the entire document
          document.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            return false;
          });

          // Also disable right-click on the canvas specifically
          const canvas = document.querySelector('.isoflow-canvas, canvas, svg');
          if (canvas) {
            canvas.addEventListener('contextmenu', (e) => {
              e.preventDefault();
              e.stopPropagation();
              return false;
            });
          }
        };

        // Disable right-click immediately and after delays
        disableRightClick();
        setTimeout(disableRightClick, 1000);
        setTimeout(disableRightClick, 3000);
      };

      // Wait a bit for Isoflow to fully initialize
      const timer = setTimeout(() => {
        // Hide menu items first
        hideMenuItems();

        // Try to activate pan tool by clicking the pan button
        const panButton = document.querySelector('[data-testid*="pan"], [aria-label*="Pan"], [title*="Pan"], .isoflow-pan-button, .pan-tool, .pan-button');
        if (panButton && panButton instanceof HTMLElement) {
          panButton.click();
          console.log('Activated pan tool');
        }

        // Alternative: try to find and activate pan mode through various selectors
        const panSelectors = [
          '[data-tool="pan"]',
          '[data-mode="pan"]',
          '.tool-pan',
          '.mode-pan',
          '.pan-mode',
          '.hand-tool',
          '.move-tool'
        ];

        for (const selector of panSelectors) {
          const element = document.querySelector(selector);
          if (element && element instanceof HTMLElement) {
            element.click();
            console.log(`Activated pan mode via ${selector}`);
            break;
          }
        }

        // Set up a mutation observer to hide menu items when they appear
        const observer = new MutationObserver(() => {
          hideMenuItems();
        });

        // Observe changes to the document body
        observer.observe(document.body, {
          childList: true,
          subtree: true
        });

        // Also run hideMenuItems periodically to catch any dynamically added items
        const intervalId = setInterval(hideMenuItems, 2000);

        // Cleanup function
        return () => {
          observer.disconnect();
          clearInterval(intervalId);
        };
      }, 1000); // Wait 1 second for Isoflow to initialize

      return () => clearTimeout(timer);
    }
  }, [loading, diagramData]);

  if (loading) {
    return (
      <div className="App">
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          fontSize: '18px'
        }}>
          Loading workspace...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="App">
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          fontSize: '18px',
          color: '#cc0000'
        }}>
          Error: {error}
        </div>
      </div>
    );
  }

  console.log('Rendering WorkspaceApp, diagramData:', diagramData);

  return (
    <div className="App">
      <style>{`
        /* Hide editing toolbars and panels */
        .isoflow-toolbar,
        .isoflow-sidebar,
        .isoflow-properties-panel,
        .isoflow-context-menu,
        .isoflow-add-button,
        .isoflow-delete-button,
        .isoflow-edit-button,
        .isoflow-duplicate-button,
        .isoflow-color-picker,
        .isoflow-text-editor,
        .isoflow-shape-selector,
        .isoflow-connector-tools,
        .isoflow-alignment-tools,
        .isoflow-layer-panel,
        [data-testid*="add"],
        [data-testid*="delete"],
        [data-testid*="edit"],
        [data-testid*="duplicate"],
        [data-testid*="color"],
        [data-testid*="text"],
        [data-testid*="shape"],
        [data-testid*="connector"],
        [data-testid*="alignment"],
        [data-testid*="layer"],
        [aria-label*="Add"],
        [aria-label*="Delete"],
        [aria-label*="Edit"],
        [aria-label*="Duplicate"],
        [aria-label*="Color"],
        [aria-label*="Text"],
        [aria-label*="Shape"],
        [aria-label*="Connector"],
        [aria-label*="Alignment"],
        [aria-label*="Layer"] {
          display: none !important;
        }

        /* Hide rectangle and shape creation tools specifically */
        .isoflow-rectangle-tool,
        .isoflow-rectangle-button,
        .isoflow-shape-tool,
        .isoflow-shape-button,
        .isoflow-draw-tool,
        .isoflow-draw-button,
        .shape-palette,
        .shape-picker,
        .drawing-tools,
        [data-testid*="rectangle"],
        [data-testid*="rect"],
        [data-testid*="square"],
        [data-testid*="circle"],
        [data-testid*="ellipse"],
        [data-testid*="triangle"],
        [data-testid*="polygon"],
        [data-testid*="draw"],
        [data-testid*="create"],
        [aria-label*="Rectangle"],
        [aria-label*="Square"],
        [aria-label*="Circle"],
        [aria-label*="Ellipse"],
        [aria-label*="Triangle"],
        [aria-label*="Polygon"],
        [aria-label*="Draw"],
        [aria-label*="Create"],
        [title*="Rectangle"],
        [title*="Square"],
        [title*="Circle"],
        [title*="Ellipse"],
        [title*="Triangle"],
        [title*="Polygon"],
        [title*="Draw"],
        [title*="Create"] {
          display: none !important;
        }

        /* Hide select tool and selection functionality */
        .isoflow-select-tool,
        .isoflow-select-button,
        .isoflow-selection-tool,
        .isoflow-selection-button,
        .select-tool,
        .selection-tool,
        [data-testid*="select"],
        [data-testid*="selection"],
        [data-testid*="cursor"],
        [data-testid*="pointer"],
        [aria-label*="Select"],
        [aria-label*="Selection"],
        [aria-label*="Cursor"],
        [aria-label*="Pointer"],
        [title*="Select"],
        [title*="Selection"],
        [title*="Cursor"],
        [title*="Pointer"] {
          display: none !important;
        }

        /* Hide undo-redo functionality */
        .isoflow-undo-button,
        .isoflow-redo-button,
        .isoflow-history-controls,
        .undo-button,
        .redo-button,
        .history-controls,
        [data-testid*="undo"],
        [data-testid*="redo"],
        [data-testid*="history"],
        [aria-label*="Undo"],
        [aria-label*="Redo"],
        [aria-label*="History"],
        [title*="Undo"],
        [title*="Redo"],
        [title*="History"] {
          display: none !important;
        }

        /* Hide specific hamburger menu items: Undo, Redo, Open, Export, Clear */
        /* Target by text content */
        .hamburger-menu .menu-item:has-text("Undo"),
        .hamburger-menu .menu-item:has-text("Redo"),
        .hamburger-menu .menu-item:has-text("Open"),
        .hamburger-menu .menu-item:has-text("Export"),
        .hamburger-menu .menu-item:has-text("Clear"),
        .menu-dropdown .menu-item:has-text("Undo"),
        .menu-dropdown .menu-item:has-text("Redo"),
        .menu-dropdown .menu-item:has-text("Open"),
        .menu-dropdown .menu-item:has-text("Export"),
        .menu-dropdown .menu-item:has-text("Clear"),
        .dropdown-menu .menu-item:has-text("Undo"),
        .dropdown-menu .menu-item:has-text("Redo"),
        .dropdown-menu .menu-item:has-text("Open"),
        .dropdown-menu .menu-item:has-text("Export"),
        .dropdown-menu .menu-item:has-text("Clear"),
        /* Target by data attributes */
        .hamburger-menu .menu-item[data-action*="undo"],
        .hamburger-menu .menu-item[data-action*="redo"],
        .hamburger-menu .menu-item[data-action*="open"],
        .hamburger-menu .menu-item[data-action*="export"],
        .hamburger-menu .menu-item[data-action*="clear"],
        .hamburger-menu .menu-item[data-action*="history"],
        .menu-dropdown .menu-item[data-action*="undo"],
        .menu-dropdown .menu-item[data-action*="redo"],
        .menu-dropdown .menu-item[data-action*="open"],
        .menu-dropdown .menu-item[data-action*="export"],
        .menu-dropdown .menu-item[data-action*="clear"],
        .menu-dropdown .menu-item[data-action*="history"],
        .dropdown-menu .menu-item[data-action*="undo"],
        .dropdown-menu .menu-item[data-action*="redo"],
        .dropdown-menu .menu-item[data-action*="open"],
        .dropdown-menu .menu-item[data-action*="export"],
        .dropdown-menu .menu-item[data-action*="clear"],
        .dropdown-menu .menu-item[data-action*="history"],
        /* Target by aria-label */
        [aria-label*="Undo"],
        [aria-label*="Redo"],
        [aria-label*="Open"],
        [aria-label*="Export"],
        [aria-label*="Clear"],
        /* Target by title */
        [title*="Undo"],
        [title*="Redo"],
        [title*="Open"],
        [title*="Export"],
        [title*="Clear"],
        /* Target menu items containing these words */
        .menu-item:contains("Undo"),
        .menu-item:contains("Redo"),
        .menu-item:contains("Open"),
        .menu-item:contains("Export as JSON"),
        .menu-item:contains("Export as image"),
        .menu-item:contains("Clear the canvas"),
        .menu-item:contains("Clear"),
        /* Additional selectors for different menu structures */
        li:contains("Undo"),
        li:contains("Redo"),
        li:contains("Open"),
        li:contains("Export as JSON"),
        li:contains("Export as image"),
        li:contains("Clear the canvas"),
        li:contains("Clear"),
        /* Button elements in menus */
        button:contains("Undo"),
        button:contains("Redo"),
        button:contains("Open"),
        button:contains("Export"),
        button:contains("Clear"),
        /* Div elements in menus */
        div:contains("Undo"),
        div:contains("Redo"),
        div:contains("Open"),
        div:contains("Export as JSON"),
        div:contains("Export as image"),
        div:contains("Clear the canvas") {
          display: none !important;
        }

        /* Additional CSS to hide menu items by nth-child if needed */
        /* Based on the menu structure shown in the image */
        .hamburger-menu > *:nth-child(1), /* Undo */
        .hamburger-menu > *:nth-child(2), /* Redo */
        .hamburger-menu > *:nth-child(4), /* Open */
        .hamburger-menu > *:nth-child(5), /* Export as JSON */
        .hamburger-menu > *:nth-child(6), /* Export as image */
        .hamburger-menu > *:nth-child(7), /* Clear the canvas */
        .menu-dropdown > *:nth-child(1),
        .menu-dropdown > *:nth-child(2),
        .menu-dropdown > *:nth-child(4),
        .menu-dropdown > *:nth-child(5),
        .menu-dropdown > *:nth-child(6),
        .menu-dropdown > *:nth-child(7),
        .dropdown-menu > *:nth-child(1),
        .dropdown-menu > *:nth-child(2),
        .dropdown-menu > *:nth-child(4),
        .dropdown-menu > *:nth-child(5),
        .dropdown-menu > *:nth-child(6),
        .dropdown-menu > *:nth-child(7) {
          display: none !important;
        }

        /* Hide right-click context menus */
        .context-menu,
        .contextmenu,
        .right-click-menu {
          display: none !important;
        }

        /* Hide only specific menu separators that appear orphaned */
        .hamburger-menu hr:first-child,
        .menu-dropdown hr:first-child,
        .dropdown-menu hr:first-child {
          display: none !important;
        }

        /* Hide vertical line next to pan button - more targeted approach */
        .isoflow-toolbar-separator,
        .toolbar-separator,
        .toolbar-divider,
        .button-separator,
        .vertical-separator,
        [data-testid*="separator"],
        [aria-label*="separator"] {
          display: none !important;
        }

        /* Hide vertical borders that create separator lines next to buttons */
        .isoflow-toolbar > *:not(:last-child)::after,
        .toolbar > *:not(:last-child)::after,
        .tool-container > *:not(:last-child)::after,
        .button-container > *:not(:last-child)::after {
          display: none !important;
        }

        /* Remove vertical borders from toolbar elements */
        .isoflow-toolbar *,
        .toolbar *,
        [class*="toolbar"] * {
          border-left: none !important;
          border-right: none !important;
          box-shadow: none !important;
        }

        /* Aggressively hide any thin vertical elements that could be separators */
        div[style*="width: 1px"],
        div[style*="width:1px"],
        div[style*="width: 2px"],
        div[style*="width:2px"],
        span[style*="width: 1px"],
        span[style*="width:1px"],
        span[style*="width: 2px"],
        span[style*="width:2px"] {
          display: none !important;
        }

        /* Hide any element that looks like a vertical separator based on computed styles */
        *[style*="border-left"],
        *[style*="border-right"] {
          border-left: none !important;
          border-right: none !important;
        }

        /* Nuclear option: Hide any element in the top-left that could be a vertical separator */
        div:first-child div:first-child div[style*="position: absolute"],
        div:first-child div:first-child span[style*="position: absolute"],
        div[style*="position: absolute"][style*="left"],
        div[style*="position: absolute"][style*="top"],
        span[style*="position: absolute"][style*="left"],
        span[style*="position: absolute"][style*="top"] {
          display: none !important;
        }

        /* Hide any SVG lines that might be creating the separator */
        svg line,
        svg rect[width="1"],
        svg rect[width="2"] {
          display: none !important;
        }

        /* Ultra-specific targeting for the vertical line next to pan button */
        /* Hide any element positioned in the top-left area that could be the separator */
        *[style*="position: absolute"][style*="left: 4"],
        *[style*="position: absolute"][style*="left:4"],
        *[style*="position: absolute"][style*="left: 5"],
        *[style*="position: absolute"][style*="left:5"],
        *[style*="position: absolute"][style*="left: 6"],
        *[style*="position: absolute"][style*="left:6"],
        *[style*="position: absolute"][style*="left: 48"],
        *[style*="position: absolute"][style*="left:48"],
        *[style*="position: absolute"][style*="left: 49"],
        *[style*="position: absolute"][style*="left:49"],
        *[style*="position: absolute"][style*="left: 50"],
        *[style*="position: absolute"][style*="left:50"],
        *[style*="position: absolute"][style*="left: 51"],
        *[style*="position: absolute"][style*="left:51"],
        *[style*="position: absolute"][style*="left: 52"],
        *[style*="position: absolute"][style*="left:52"] {
          display: none !important;
        }

        /* Hide any element with specific positioning that creates vertical lines */
        div[style*="height"][style*="width: 1px"][style*="position"],
        div[style*="height"][style*="width:1px"][style*="position"],
        span[style*="height"][style*="width: 1px"][style*="position"],
        span[style*="height"][style*="width:1px"][style*="position"] {
          display: none !important;
        }

        /* Final attempt: Hide any element that could be the vertical line using CSS */
        /* Target elements with very specific characteristics of a vertical separator */
        *[style*="background-color"][style*="width: 1px"],
        *[style*="background-color"][style*="width:1px"],
        *[style*="background"][style*="width: 1px"],
        *[style*="background"][style*="width:1px"],
        *[style*="border"][style*="width: 1px"],
        *[style*="border"][style*="width:1px"] {
          display: none !important;
        }

        /* Hide any absolutely positioned thin elements */
        *[style*="position: absolute"][style*="width: 1px"],
        *[style*="position: absolute"][style*="width:1px"],
        *[style*="position: absolute"][style*="width: 2px"],
        *[style*="position: absolute"][style*="width:2px"] {
          display: none !important;
        }

        /* Remove outlines but don't hide all 1px elements */
        * {
          outline: none !important;
        }

        /* Final attempt: Hide any 1px wide element in the top-left corner */
        div[style*="width: 1px"][style*="height"],
        div[style*="width:1px"][style*="height"],
        span[style*="width: 1px"][style*="height"],
        span[style*="width:1px"][style*="height"] {
          display: none !important;
        }

        /* Target the specific MUI Divider that creates the vertical line next to pan button */
        .MuiDivider-root.MuiDivider-vertical,
        .MuiDivider-vertical,
        .MuiDivider-flexItem,
        hr.MuiDivider-root,
        hr.MuiDivider-vertical,
        .css-1nvuyy-MuiDivider-root,
        [class*="MuiDivider-vertical"],
        [class*="MuiDivider-root"],
        [class*="MuiDivider-flexItem"],
        [class*="css-"][class*="MuiDivider"] {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
        }
        hr.MuiDivider-vertical,
        .MuiDivider-flexItem,
        .css-1nvuyy-MuiDivider-root,
        [class*="MuiDivider-vertical"],
        [class*="MuiDivider-root"],
        [class*="MuiDivider-flexItem"],
        [class*="css-"][class*="MuiDivider"] {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
        }
        hr.MuiDivider-vertical,
        .MuiDivider-flexItem,
        .css-1nvuyy-MuiDivider-root,
        [class*="MuiDivider-vertical"],
        [class*="MuiDivider-root"],
        [class*="MuiDivider-flexItem"],
        [class*="css-"][class*="MuiDivider"] {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
        }
        hr.MuiDivider-vertical,
        .MuiDivider-flexItem,
        .css-1nvuyy-MuiDivider-root,
        [class*="MuiDivider-vertical"],
        [class*="MuiDivider-root"],
        [class*="MuiDivider-flexItem"] {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
        }
        hr.MuiDivider-vertical,
        [class*="MuiDivider-vertical"],
        [class*="MuiDivider-root"],
        .css-1nvuyy-MuiDivider-root {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
        }
        hr.MuiDivider-vertical,
        [class*="MuiDivider-vertical"],
        [class*="MuiDivider-root"] {
          display: none !important;
        }

        /* Keep essential navigation controls visible */
        .isoflow-zoom-controls,
        .isoflow-pan-controls,
        .isoflow-fit-to-screen,
        .isoflow-navigation,
        .isoflow-minimap,
        [data-testid*="zoom"],
        [data-testid*="pan"],
        [data-testid*="fit"],
        [data-testid*="navigation"],
        [data-testid*="minimap"],
        [aria-label*="Zoom"],
        [aria-label*="Pan"],
        [aria-label*="Fit"],
        [aria-label*="Navigation"],
        [aria-label*="Minimap"] {
          display: block !important;
        }

        /* Disable pointer events on diagram elements to prevent editing */
        .isoflow-canvas .isoflow-node,
        .isoflow-canvas .isoflow-connector,
        .isoflow-canvas .isoflow-shape {
          pointer-events: none !important;
        }

        /* Re-enable pointer events for the canvas itself to allow panning */
        .isoflow-canvas {
          pointer-events: auto !important;
        }

        /* Hide selection handles and resize controls */
        .selection-handle,
        .resize-handle,
        .rotation-handle,
        .connector-handle,
        .node-handle {
          display: none !important;
        }

        /* Make the workspace read-only by hiding editing cursors */
        .isoflow-canvas * {
          cursor: default !important;
        }

        /* Allow pan cursor on canvas background */
        .isoflow-canvas {
          cursor: grab !important;
        }

        .isoflow-canvas:active {
          cursor: grabbing !important;
        }
      `}</style>
      <div className="fossflow-container" style={{ height: '100vh' }}>
        {diagramData ? (
          <Isoflow
            initialData={diagramData}
          />
        ) : (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            fontSize: '18px'
          }}>
            No diagram data available
          </div>
        )}
      </div>
    </div>
  );
}

export default WorkspaceApp;