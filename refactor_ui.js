const fs = require('fs');

// 1. Fix WebLLMChat.tsx (Engine Memory Leak)
let webllm = fs.readFileSync('components/WebLLMChat.tsx', 'utf8');
if (!webllm.includes('engine.unload()')) {
    webllm = webllm.replace(
        'setSupported(false);\n        }\n    }, []);',
        'setSupported(false);\n        }\n    }, []);\n\n    useEffect(() => {\n        return () => {\n            if (engine) engine.unload();\n        };\n    }, [engine]);'
    );
    fs.writeFileSync('components/WebLLMChat.tsx', webllm);
    console.log('Fixed WebLLMChat.tsx');
}

// 2. Fix BadgeModal.tsx (Focus Trap & ARIA)
let badge = fs.readFileSync('components/BadgeModal.tsx', 'utf8');
if (!badge.includes('role="dialog"')) {
    badge = badge.replace(
        '<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">',
        '<div role="dialog" aria-modal="true" aria-labelledby="modal-title" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">'
    );
    badge = badge.replace(
        'onClick={(e) => e.stopPropagation()}',
        'onClick={(e) => e.stopPropagation()}\n                tabIndex={-1}\n                autoFocus'
    );
    badge = badge.replace(
        '<h3 className="text-base font-bold text-zinc-100">README Rozeti Al</h3>',
        '<h3 id="modal-title" className="text-base font-bold text-zinc-100">README Rozeti Al</h3>'
    );
    fs.writeFileSync('components/BadgeModal.tsx', badge);
    console.log('Fixed BadgeModal.tsx');
}

// 3. Fix app/page.tsx (Strict State Machine)
let page = fs.readFileSync('app/page.tsx', 'utf8');
if (!page.includes('type AppState =')) {
    page = page.replace(
        'export default function Home() {\n  const [data, setData] = useState<AnalyzeResponse | null>(null);\n  const [loading, setLoading] = useState(false);\n  const [error, setError] = useState<string | null>(null);',
        `type AppState = 
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'rate-limited'; error: string }
  | { status: 'error'; error: string }
  | { status: 'success'; data: AnalyzeResponse };

export default function Home() {
  const [state, setState] = useState<AppState>({ status: 'idle' });`
    );

    page = page.replace(
        'const runAnalysis = useCallback(async (url: string) => {\n    setLoading(true);\n    setError(null);\n    setData(null);',
        'const runAnalysis = useCallback(async (url: string) => {\n    setState({ status: "loading" });'
    );

    page = page.replace(
        '      const result = json as AnalyzeResponse;\n      setData(result);\n      setCurrentRepo(result.meta.fullName);\n      setCached(result.meta.fullName, result);\n    } catch (e: unknown) {\n      setError(e instanceof Error ? e.message : "Beklenmedik bir hata oluştu.");\n    } finally {\n      setLoading(false);\n    }',
        `      const result = json as AnalyzeResponse;
      setState({ status: "success", data: result });
      setCurrentRepo(result.meta.fullName);
      setCached(result.meta.fullName, result);
    } catch (e: any) {
      if (e.message?.includes("403") || e.message?.includes("API rate limit")) {
          setState({ status: "rate-limited", error: e.message });
      } else {
          setState({ status: "error", error: e instanceof Error ? e.message : "Beklenmedik bir hata oluştu." });
      }
    }`
    );

    page = page.replace(
        /const cached = getCached\(fullName\);\s+if \(cached\) {\n\s+setData\(cached\);\n\s+setCurrentRepo\(fullName\);\n\s+setError\(null\);\n\s+setLoading\(false\);\n\s+return;\n\s+}/g,
        `const cached = getCached(fullName);
      if (cached) {
        setState({ status: "success", data: cached });
        setCurrentRepo(fullName);
        return;
      }`
    );

    page = page.replace(
        /const cached = getCached\(fullName\);\s+if \(cached\) {\n\s+setData\(cached\);\n\s+setCurrentRepo\(fullName\);\n\s+setError\(null\);\n\s+}\s+else\s+{\n\s+runAnalysis\(`https:\/\/github.com\/\$\{fullName\}`\);\n\s+}/g,
        `const cached = getCached(fullName);
    if (cached) {
      setState({ status: "success", data: cached });
      setCurrentRepo(fullName);
    } else {
      runAnalysis(\`https://github.com/\$\{fullName\}\`);
    }`
    );

    page = page.replace(/isLoading={loading}/g, 'isLoading={state.status === "loading"}');
    page = page.replace(/{loading && \(/g, '{state.status === "loading" && (');
    page = page.replace(/{error && !loading && \(/g, '{state.status === "error" && (');
    page = page.replace(/{data && !loading && \(/g, '{state.status === "success" && (');
    page = page.replace(/{!data && !loading && !error && \(/g, '{state.status === "idle" && (');

    // Convert data to state.data for the dashboard chunk
    page = page.split('{state.status === "success" && (').map((part, index) => {
        if (index === 0) return part;
        // Inner replacements strictly inside the success block
        let modified = part.replace(/data\./g, 'state.data.');
        // Also fix ExportReport, ExplainDrawer, WebLLMChat data prop
        modified = modified.replace(/data={data}/g, 'data={state.data}');
        return modified;
    }).join('{state.status === "success" && (');

    // Add rate-limit banner logic
    page = page.replace(
        '{state.status === "error" && (',
        `{state.status === "rate-limited" && (
          <div className="max-w-2xl mx-auto pb-16 animate-in fade-in">
            <div className="flex items-start gap-4 p-5 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
              <AlertCircle className="w-6 h-6 text-amber-500 mt-0.5 flex-shrink-0" />
              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-bold text-amber-500">GitHub API Limiti Aşıldı</h3>
                  <p className="text-sm text-amber-500/80 mt-1">
                    Saatlik 60 istek sınırına ulaştınız. Analize devam etmek için bir GitHub Token ekleyebilirsiniz.
                  </p>
                </div>
                <div className="p-3 bg-black/20 rounded-xl text-xs font-mono text-amber-200/70">
                  {state.error}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {state.status === "error" && (`
    );

    page = page.replace(
        '<p className="font-medium text-sm">Analiz başarısız</p>\n                <p className="text-sm text-red-400/70">{error}</p>',
        '<p className="font-medium text-sm">Analiz başarısız</p>\n                <p className="text-sm text-red-400/70">{state.error}</p>'
    );

    fs.writeFileSync('app/page.tsx', page);
    console.log('Fixed app/page.tsx');
}
