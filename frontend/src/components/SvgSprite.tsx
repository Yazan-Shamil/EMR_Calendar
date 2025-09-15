import { useEffect } from "react";

export function SvgSprite() {
  useEffect(() => {
    // Load the SVG sprite
    fetch("/icons/sprite.svg")
      .then((response) => response.text())
      .then((svgContent) => {
        const div = document.createElement("div");
        div.innerHTML = svgContent;
        div.style.display = "none";
        document.body.appendChild(div);
      });
  }, []);

  return null;
}