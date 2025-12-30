"use client";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export const BackgroundBeams = ({ className }: { className?: string }) => {
  const beamsRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = beamsRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    

    const beams = [
      { x: 10, speed: 0.5, width: 1, opacity: 0.2 },
      { x: 40, speed: 1, width: 2, opacity: 0.1 },
      { x: 70, speed: 0.75, width: 1, opacity: 0.15 },
      { x: 100, speed: 1.2, width: 1.5, opacity: 0.1 },
      { x: 130, speed: 0.6, width: 1, opacity: 0.2 },
    ];

    const render = () => {

      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const time = Date.now() / 1000;


      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, "rgba(255, 255, 255, 0)");
      gradient.addColorStop(0.5, "rgba(255, 255, 255, 0.02)");
      gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);


      beams.forEach((beam, i) => {

        
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);

        ctx.rotate((time * 0.05 * (i % 2 === 0 ? 1 : -1)) + i);
        

        const beamGradient = ctx.createLinearGradient(0, 0, 0, -canvas.height);
        beamGradient.addColorStop(0, `rgba(50, 100, 255, 0)`);
        beamGradient.addColorStop(0.5, `rgba(100, 150, 255, ${beam.opacity})`);
        beamGradient.addColorStop(1, `rgba(50, 100, 255, 0)`);
        
        ctx.fillStyle = beamGradient;

        const beamW = beam.width * (canvas.width / 100); 
        ctx.fillRect(-beamW / 2, -canvas.height, beamW, canvas.height * 2);
        
        ctx.restore();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={beamsRef}
      className={cn(
        "absolute inset-0 z-0 h-full w-full pointer-events-none opacity-40",
        className
      )}
    />
  );
};
