'use client';

export default function DarkModeTest() {
  return (
    <div className="fixed top-4 left-4 p-6 border-4 z-[99999]" style={{ minWidth: '300px' }}>
      <h2 className="text-2xl font-bold mb-4">🧪 Dark Mode Test</h2>

      <div className="space-y-2">
        {/* Test 1: Simple background colors */}
        <div className="p-4 bg-white dark:bg-black border-2 border-red-500">
          <p className="text-black dark:text-white">
            Test 1: Should be WHITE bg / BLACK text in light mode
            <br />
            Should be BLACK bg / WHITE text in dark mode
          </p>
        </div>

        {/* Test 2: Different colors */}
        <div className="p-4 bg-blue-500 dark:bg-red-500">
          <p className="text-white">
            Test 2: Should be BLUE in light mode, RED in dark mode
          </p>
        </div>

        {/* Test 3: Inline style test */}
        <div className="p-4" style={{ backgroundColor: 'yellow', color: 'black' }}>
          <p>Test 3: Inline styles (should always be YELLOW)</p>
        </div>

        {/* Test 4: Border colors */}
        <div className="p-4 border-4 border-green-500 dark:border-purple-500 bg-gray-100 dark:bg-gray-800">
          <p className="text-gray-900 dark:text-gray-100">
            Test 4: GREEN border (light) / PURPLE border (dark)
          </p>
        </div>

        {/* DOM Info */}
        <div className="p-2 bg-gray-200 dark:bg-gray-700 text-xs font-mono">
          <div>HTML class: <span id="html-class-display"></span></div>
          <script dangerouslySetInnerHTML={{__html: `
            setInterval(() => {
              const el = document.getElementById('html-class-display');
              if (el) el.textContent = document.documentElement.className || '(none)';
            }, 100);
          `}} />
        </div>
      </div>

      <button
        onClick={() => {
          const html = document.documentElement;
          html.classList.toggle('dark');
          console.log('[DarkModeTest] Toggled dark class. Current classes:', html.className);
        }}
        className="mt-4 px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
      >
        Manual Toggle Dark Class
      </button>
    </div>
  );
}
