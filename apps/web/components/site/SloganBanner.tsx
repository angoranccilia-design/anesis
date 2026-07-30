import Image from "next/image";
import { Reveal } from "@/components/Reveal";

/** Bannière plein écran : image + overlay sombre (lisibilité garantie) + une phrase slogan. */
export function SloganBanner({ image, slogan }: { image: string; slogan: string }) {
  return (
    <section className="relative flex min-h-[58vh] items-center justify-center overflow-hidden">
      <Image src={image} alt="" fill sizes="100vw" className="object-cover" />
      <div className="absolute inset-0 bg-forest-950/60" aria-hidden="true" />
      <div className="container-editorial relative text-center">
        <Reveal>
          <p
            className="mx-auto max-w-3xl font-serif text-3xl font-light italic leading-snug text-cream-50 md:text-5xl"
            style={{ textWrap: "balance" }}
          >
            {slogan}
          </p>
        </Reveal>
      </div>
    </section>
  );
}
