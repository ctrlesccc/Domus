import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../state/auth";

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("Domus123!");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/60 bg-white/80 shadow-[0_30px_100px_rgba(61,43,13,0.15)] backdrop-blur lg:grid-cols-[1.1fr_0.9fr]">
        <div className="bg-[linear-gradient(160deg,rgba(29,28,23,0.98),rgba(67,96,90,0.92),rgba(146,88,45,0.92))] px-8 py-10 text-white md:px-10">
          <img
            src="/domuslogo.png"
            alt="DOMUS"
            className="h-12 w-auto object-contain"
          />
          <h1 className="mt-5 text-4xl font-semibold leading-tight">Eén plek voor alles rondom wonen en administratie.</h1>
          <p className="mt-5 max-w-lg text-sm leading-7 text-stone-200">
            Beheer contracten, uploads, persoonlijke relaties en terugkerende verplichtingen in een rustige, zelf-hostbare webapp.
          </p>
        </div>

        <div className="px-8 py-10 md:px-10">
          <h2 className="text-2xl font-semibold text-ink-900">Inloggen</h2>
          <p className="mt-3 text-sm leading-6 text-stone-600">Gebruik het beheerdersaccount om DOMUS te openen.</p>

          <form
            className="mt-8 space-y-4"
            onSubmit={async (event) => {
              event.preventDefault();
              setError("");
              setIsSubmitting(true);

              try {
                await login(username, password);
                navigate("/dashboard");
              } catch (submissionError) {
                setError(submissionError instanceof Error ? submissionError.message : "Inloggen mislukt.");
              } finally {
                setIsSubmitting(false);
              }
            }}
          >
            <div>
              <label className="mb-2 block text-sm font-medium text-stone-700">Gebruikersnaam</label>
              <input className="app-input" value={username} onChange={(event) => setUsername(event.target.value)} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-stone-700">Wachtwoord</label>
              <input
                className="app-input"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            {error ? <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
            <button className="app-button w-full" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Bezig..." : "Open DOMUS"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
