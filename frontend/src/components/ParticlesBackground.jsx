import React from 'react';
import Particles from 'react-tsparticles';
import { loadSlim } from 'tsparticles-slim';

const ParticlesBackground = () => {
  const particlesInit = async (engine) => {
    await loadSlim(engine);
  };

  return (
    <Particles
      id="tsparticles"
      init={particlesInit}
      options={{
        fpsLimit: 60,
        interactivity: {
          events: {
            onClick: {
              enable: true,
              mode: "push",
            },
            onHover: {
              enable: true,
              mode: "repulse",
            },
          },
          modes: {
            push: {
              quantity: 4,
            },
            repulse: {
              distance: 100,
              duration: 0.4,
            },
          },
        },
        particles: {
          color: {
            value: ["#ffffff", "#60a5fa", "#fbbf24"],
          },
          links: {
            color: "#cbd5f5",
            distance: 140,
            enable: true,
            opacity: 0.25,
            width: 1.2,
          },
          move: {
            direction: "none",
            enable: true,
            outModes: {
              default: "bounce",
            },
            random: false,
            speed: 1.6,
            straight: false,
          },
          number: {
            density: {
              enable: true,
            },
            value: 80,
          },
          opacity: {
            value: { min: 0.2, max: 0.5 },
          },
          shape: {
            type: ["circle", "triangle"],
          },
          size: {
            value: { min: 0.8, max: 3.2 },
          },
        },
        detectRetina: true,
      }}
    />
  );
};

export default ParticlesBackground;