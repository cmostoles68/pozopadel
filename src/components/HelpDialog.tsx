"use client";

import { useState } from "react";
import Modal from "@/components/ui/modal";

type BadgeTone = "primary" | "secondary";

interface Step {
  icon: string;
  badge: string;
  badgeTone: BadgeTone;
  title: string;
  body: string;
  bullets?: string[];
  algorithms?: { title: string; desc: string }[];
  sections?: { title: string; desc: string }[];
}

const STEPS: Step[] = [
  {
    icon: "manage_accounts",
    badge: "Acceso",
    badgeTone: "primary",
    title: "Modo de acceso: Invitado vs Admin",
    body: "Antes de empezar, elige cómo entrar desde la pantalla de acceso. Según el modo, tendrás más o menos libertad a la hora de crear y editar.",
    bullets: [
      "Entrar como Invitado no requiere credenciales: puedes ver y jugar, pero está sujeto a límites pensados para pruebas rápidas (p. ej. máximo 32 jugadores, 1 pozo activo y 8 pistas por pozo).",
      "Entrar como Admin requiere la contraseña de administrador y elimina esos límites: puedes crear varios pozos, superar los 32 jugadores o usar más de 8 pistas sin restricciones.",
      "Ambos modos guardan los datos en tu propio espacio: cada uno solo ve su lista de jugadores, sus pozos y su histórico.",
    ],
  },
  {
    icon: "group",
    badge: "Ejecución rápida",
    badgeTone: "secondary",
    title: "Gestión de Jugadores",
    body: "El primer paso es generar la lista de jugadores participantes desde la sección Jugadores.",
    bullets: [
      "Si ya han jugado antes, ve a la sección Histórico y cárgalos directamente con el botón \u201CCargar de Histórico\u201D para no volver a teclear sus datos.",
      "El número total de jugadores es clave: determina cuántas pistas necesitará el pozo.",
    ],
  },
  {
    icon: "shuffle",
    badge: "4 algoritmos",
    badgeTone: "primary",
    title: "Sorteo de Parejas y Algoritmos",
    body: "Forma las parejas iniciales eligiendo uno de los criterios de sorteo disponibles en la sección Sorteo.",
    bullets: [
      "Cualquiera que sea el criterio, el sistema tiene en cuenta los pozos anteriores: las parejas que ya se proclamaron campeonas no se vuelven a juntar en sorteos futuros.",
    ],
    algorithms: [
      {
        title: "Aleatorio Total",
        desc: "Emparejamiento completamente al azar entre todos los participantes.",
      },
      {
        title: "Aleatorio Mixto",
        desc: "Forma parejas compuestas por un hombre y una mujer, de forma aleatoria.",
      },
      {
        title: "Por Niveles Total",
        desc: "Compensa los niveles del grupo: los jugadores de nivel más alto se emparejan con los de nivel más bajo.",
      },
      {
        title: "Por Niveles Mixto",
        desc: "Combina la restricción de género (hombre y mujer) equilibrando además la suma de sus niveles.",
      },
    ],
  },
  {
    icon: "settings",
    badge: "Evento",
    badgeTone: "secondary",
    title: "Configuración del Pozo",
    body: "Al crear el pozo defines el tiempo por ronda (en minutos) y el número de pistas disponibles.",
    bullets: [
      "No hay límite máximo de rondas: el pozo durará lo que la organización decida.",
    ],
  },
  {
    icon: "grid_view",
    badge: "Pista Rey",
    badgeTone: "primary",
    title: "Asignación de Pistas",
    body: "Una vez creado el pozo, realiza el sorteo de pistas para determinar qué pareja juega en cada pista durante la primera ronda.",
    bullets: [
      "La Pista 1 se marca como \u201CPista Rey\u201D y es la más importante del pozo.",
    ],
  },
  {
    icon: "timer",
    badge: "Tiempo y resultado",
    badgeTone: "secondary",
    title: "Dinámica de Juego, Tiempo y Resultados",
    body: "Durante cada ronda del pozo se gestiona el tiempo y el registro de cada pista.",
    sections: [
      {
        title: "Temporizador",
        desc: "Inicia el tiempo de la ronda pulsando sobre el temporizador. Puedes pausarlo o reanudarlo en cualquier momento volviendo a pulsar sobre él.",
      },
      {
        title: "Registro de marcador",
        desc: "Al terminar el tiempo o el partido, pulsa sobre el número de la pareja ganadora de cada pista. Introduce el marcador de juegos/puntos si se requiere y haz clic en \u201CRegistrar marcador\u201D.",
      },
      {
        title: "Generación de la siguiente ronda",
        desc: "Con todos los resultados registrados, el sistema aplica la rotación automática \u201Csube y baja\u201D: los ganadores ascienden o se quedan en la Pista 1 y los perdedores descienden. Así se crea la siguiente ronda.",
      },
    ],
  },
  {
    icon: "emoji_events",
    badge: "Campeón",
    badgeTone: "primary",
    title: "Finalización del Pozo",
    body: "Para dar por concluido el torneo, pulsa el botón \u201CFinalizar Pozo\u201D.",
    bullets: [
      "El sistema declara pareja campeona a la que resulte victoriosa en la Pista 1 (Pista Rey) en la última ronda disputada.",
    ],
  },
  {
    icon: "history",
    badge: "Guardado automático",
    badgeTone: "secondary",
    title: "Histórico y Evitación de Repeticiones",
    body: "Los perfiles de los jugadores, el historial de rondas y sus campeones quedan guardados automáticamente en el Histórico.",
    bullets: [
      "Estos datos permiten recuperar rápidamente a los jugadores en futuros eventos.",
      "El sistema ejecuta sorteos inteligentes que evitan repetir parejas que ya se hayan proclamado campeonas de un pozo completo.",
    ],
  },
];

export default function HelpDialog() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Floating help button (bottom-right, mobile-first) */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ayuda: cómo funciona el pozo"
        title="¿Cómo funciona?"
        className="fixed z-50 bottom-5 right-5 sm:bottom-6 sm:right-6 w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center rounded-full bg-secondary-container text-on-secondary-container shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_8px_30px_rgba(0,0,0,0.4)] border border-white/10 hover:bg-white transition-colors"
      >
        <span className="material-symbols-outlined text-[28px] sm:text-[32px]">
          help
        </span>
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        icon="live_help"
        title="¿Cómo funciona el Pozo?"
        size="lg"
      >
        <div className="p-4 sm:p-6 space-y-4">
          <div className="rounded-2xl bg-secondary-container/15 border border-secondary-container/20 px-4 py-3 text-base sm:text-lg text-on-surface">
            Tutorial paso a paso para organizar una sesión de Pozos de Pádel.
          </div>

          {STEPS.map((step, i) => (
            <StepCard key={step.title} index={i} step={step} />
          ))}

          <div className="pt-1 text-center">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full bg-secondary-container text-on-secondary-container px-10 py-4 font-display font-semibold text-lg hover:bg-white transition-colors"
            >
              ¡Entendido!
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

function StepCard({ index, step }: { index: number; step: Step }) {
  return (
    <article className="glass-panel rounded-2xl p-4 sm:p-5 space-y-3 relative overflow-hidden">
      <span className="absolute top-0 left-0 w-1 h-full bg-secondary-container/40" />

      <div className="flex items-start gap-3">
        <span className="shrink-0 flex items-center justify-center w-12 h-12 rounded-full bg-primary-container text-on-primary-container">
          <span className="material-symbols-outlined text-[28px]">
            {step.icon}
          </span>
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-display text-base font-bold text-secondary-fixed-dim">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span
              className={`rounded-full px-3 py-1 text-sm font-semibold uppercase tracking-wide ${
                step.badgeTone === "primary"
                  ? "bg-primary-container text-on-primary-container"
                  : "bg-secondary-container/20 text-secondary-fixed-dim border border-secondary-container/30"
              }`}
            >
              {step.badge}
            </span>
          </div>
          <h3 className="mt-1 font-display text-lg sm:text-xl font-bold text-on-surface leading-snug">
            {step.title}
          </h3>
        </div>
      </div>

      <p className="text-base sm:text-lg text-on-surface-variant leading-relaxed">
        {step.body}
      </p>

      {step.bullets && step.bullets.length > 0 && (
        <ul className="space-y-2">
          {step.bullets.map((b) => (
            <li
              key={b}
              className="flex items-start gap-2 text-base sm:text-lg text-on-surface leading-relaxed"
            >
              <span className="material-symbols-outlined text-secondary-container text-[22px] shrink-0 mt-0.5">
                check_circle
              </span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      )}

      {step.algorithms && step.algorithms.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-2">
          {step.algorithms.map((a, ai) => (
            <div
              key={a.title}
              className="rounded-xl bg-surface-low/60 border border-outline-variant/15 p-3 space-y-1"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-on-surface-variant">
                  {String(ai + 1).padStart(2, "0")}
                </span>
                <span className="text-base sm:text-lg font-semibold text-on-surface">
                  {a.title}
                </span>
              </div>
              <p className="text-sm sm:text-base text-on-surface-variant leading-relaxed">
                {a.desc}
              </p>
            </div>
          ))}
        </div>
      )}

      {step.sections && step.sections.length > 0 && (
        <div className="space-y-2">
          {step.sections.map((s) => (
            <div
              key={s.title}
              className="flex items-start gap-2 rounded-xl bg-surface-low/60 border border-outline-variant/15 p-3"
            >
              <span className="material-symbols-outlined text-secondary-container text-[24px] shrink-0 mt-0.5">
                scoreboard
              </span>
              <div>
                <div className="text-base sm:text-lg font-semibold text-on-surface">
                  {s.title}
                </div>
                <p className="text-sm sm:text-base text-on-surface-variant leading-relaxed mt-0.5">
                  {s.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}
