import { useState, useEffect, useRef } from 'react';
import { Camera, Receipt, Type, ChevronDown, Star, Info } from 'lucide-react';

interface HomePageProps {
  onAddFromPhoto?: () => void;
  onScanReceipt?: () => void;
  onTypeIngredients?: () => void; // Can open a modal or navigate to Pantry
}

interface InfoCardProps {
  title: string;
  subtitle: string;
  delay: number;
}

function InfoCard({ title, subtitle, delay }: InfoCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.setAttribute('data-in-view', 'true');
          }
        });
      },
      { threshold: 0.1 }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => {
      if (cardRef.current) {
        observer.unobserve(cardRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={cardRef}
      className="opacity-0 translate-y-8 rounded-lg bg-white border border-gray-200 shadow-sm p-4 flex items-center gap-4"
      style={{
        transitionDelay: `${delay}ms`,
        transition: 'all 0.6s ease-out',
      }}
    >
      <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[#84CC16]/10 text-[#84CC16] flex-shrink-0">
        <Info className="w-5 h-5" />
      </span>
      <div className="flex-1">
        <div className="font-semibold text-[#1F2937]">{title}</div>
        <div className="text-sm text-[#6B7280] mt-1">{subtitle}</div>
      </div>
    </div>
  );
}

export default function HomePage({ onAddFromPhoto, onScanReceipt, onTypeIngredients }: HomePageProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative z-10">
      {/* Hero Section */}
      <section className="max-w-3xl mx-auto text-center pt-20 pb-8 px-4 animate-fade-in">
        <h1 className="text-5xl font-bold text-[#1F2937]">Pantry Dropper</h1>
        <p className="mt-3 text-xl text-[#6B7280]">
          Cooking on easy mode
        </p>
      </section>

      {/* Pantry Filler CTA */}
      <section className="max-w-3xl mx-auto px-4">
        <div className="flex justify-center">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center justify-between bg-[#84CC16] hover:bg-[#65A30D] text-white px-8 py-4 rounded-xl text-lg font-medium shadow-lime-glow hover:scale-[1.02] relative"
          style={{width: 200}}
        >
          <span className="flex-1 text-center">Pantry Filler</span>
          <ChevronDown className={`w-5 h-5 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        </div>

        {/* Accordion */}
        <div
          className={`overflow-hidden transition-all duration-300 ${open ? 'mt-4 max-h-[480px]' : 'max-h-0'}`}
        >
          <div className="grid sm:grid-cols-3 gap-4 animate-slide-up">
            {/* Action 1: Add from Photo */}
            <button
              type="button"
              onClick={onAddFromPhoto}
              className="group w-full rounded-xl border border-[#FEE2E2] bg-white/80 backdrop-blur px-5 py-6 text-left shadow-sm hover:shadow-md transition hover:bg-[#FFF7ED] hover:text-[#FB923C]"
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-[#FFE4E6] text-[#FB923C]">
                  <Camera className="w-5 h-5" />
                </span>
                <div>
                  <div className="font-semibold text-[#1F2937] group-hover:text-[#FB923C]">Add from Photo</div>
                  <div className="text-sm text-[#6B7280]">Snap a picture of your ingredients</div>
                </div>
              </div>
            </button>

            {/* Action 2: Scan Receipt */}
            <button
              type="button"
              onClick={onScanReceipt}
              className="group w-full rounded-xl border border-[#E5E7EB] bg-white/80 backdrop-blur px-5 py-6 text-left shadow-sm hover:shadow-md transition hover:bg-white"
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-[#ECFDF5] text-[#10B981]">
                  <Receipt className="w-5 h-5" />
                </span>
                <div>
                  <div className="font-semibold text-[#1F2937]">Scan Receipt</div>
                  <div className="text-sm text-[#6B7280]">Extract items automatically</div>
                </div>
              </div>
            </button>

            {/* Action 3: Type Ingredients */}
            <button
              type="button"
              onClick={onTypeIngredients}
              className="group w-full rounded-xl border border-[#E5E7EB] bg-white/80 backdrop-blur px-5 py-6 text-left shadow-sm hover:shadow-md transition hover:bg-white"
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-[#EEF2FF] text-[#6366F1]">
                  <Type className="w-5 h-5" />
                </span>
                <div>
                  <div className="font-semibold text-[#1F2937]">Type Ingredients</div>
                  <div className="text-sm text-[#6B7280]">Open the Pantry to add items</div>
                </div>
              </div>
            </button>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="max-w-6xl mx-auto px-4 mt-20">
        <h2 className="text-3xl font-bold text-[#1F2937] text-center">Loved by Home Cooks</h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              quote: 'This saved my weeknight dinners — so easy to use!',
              name: 'Sarah K.',
              role: 'Busy Mom',
            },
            {
              quote: 'Pantry matches are spot on. Less waste, more flavor.',
              name: 'James R.',
              role: 'Foodie & Meal Prepper',
            },
            {
              quote: 'Love the simplicity and the results. Five stars!',
              name: 'Priya S.',
              role: 'Home Chef',
            },
          ].map((t, idx) => (
            <article
              key={idx}
              className="rounded-2xl bg-white/90 backdrop-blur p-6 shadow-md border border-[#FDE68A] hover:shadow-lg transition animate-slide-up"
            >
              <div className="flex items-center gap-1 text-yellow-400 mb-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-[#1F2937]">{t.quote}</p>
              <div className="mt-4 text-sm text-[#6B7280]">
                <span className="font-semibold text-[#FB923C]">{t.name}</span> · {t.role}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Info Cards Section */}
      <section className="max-w-3xl mx-auto px-4 py-16">
        <h3 className="text-2xl font-semibold text-[#1F2937] mb-8 text-center">No more 'What am I cooking tonight?'</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            {
              title: 'Drop Your Pantry',
              subtitle: 'Upload a photo or scan a receipt — we detect ingredients instantly.',
            },
            {
              title: 'AI-Powered Matching',
              subtitle: 'We find recipes that use exactly what you have — no waste.',
            },
            {
              title: 'Real Match %',
              subtitle: 'See how much of a recipe you can make with your pantry.',
            },
            {
              title: 'Save & Organize',
              subtitle: 'Build collections, add notes, and plan meals ahead.',
            },
            {
              title: 'Community Favorites',
              subtitle: 'Discover top-rated recipes from home cooks like you.',
            },
            {
              title: 'Cook with Confidence',
              subtitle: 'Step-by-step guidance, timers, and voice mode coming soon.',
            },
          ].map((card, idx) => (
            <InfoCard
              key={idx}
              title={card.title}
              subtitle={card.subtitle}
              delay={idx * 100}
            />
          ))}
        </div>
      </section>
    </div>
  );
}


