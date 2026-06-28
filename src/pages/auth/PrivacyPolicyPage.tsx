import React from 'react';
import { useHistory } from 'react-router-dom';
import { ChevronLeft, ShieldCheck, Lock, Eye, FileText, Globe } from 'lucide-react';
import { IonContent, IonPage } from '@ionic/react';

const dataCards = [
  { title: 'Personal info', text: 'Name, email address, phone number, and profile picture provided during registration.' },
  { title: 'Location', text: 'Real-time GPS coordinates to facilitate ride matching and safety tracking.' },
  { title: 'Vehicle data', text: 'Car make, model, and registration number for driver verification.' },
  { title: 'Usage data', text: 'Information about how you interact with our services and ride history.' },
];

const usageList = [
  'To provide and maintain our Service',
  'To match riders and drivers based on location',
  'To ensure safety and security of our users',
  'To process payments and rewards',
  'To notify you about changes to our Service',
];

const PrivacyPolicyPage: React.FC = () => {
  const history = useHistory();

  return (
    <IonPage>
      <IonContent>
        <div className="app-top-safe relative min-h-full overflow-hidden bg-white pb-12">
          {/* Grainy orange aura */}
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[300px]">
            <div
              className="absolute inset-0"
              style={{ background: 'radial-gradient(120% 72% at 82% -10%, rgba(255,107,0,0.4) 0%, rgba(255,160,30,0.15) 46%, rgba(255,255,255,0) 74%)' }}
            />
            <div className="absolute -right-16 -top-12 h-72 w-72 rounded-full animate-aurora-1" style={{ background: 'radial-gradient(circle, rgba(255,200,50,0.62) 0%, transparent 62%)', filter: 'blur(48px)' }} />
          </div>

          <div className="relative z-10 mx-auto max-w-3xl px-4 pt-5">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => history.goBack()}
                  aria-label="Back"
                  className="flex h-11 w-11 items-center justify-center rounded-2xl border border-black/10 bg-white/70 text-ink shadow-soft backdrop-blur-sm transition active:scale-95"
                >
                  <ChevronLeft size={22} strokeWidth={2.5} />
                </button>
                <div>
                  <p className="mb-0.5 font-display text-xs font-bold uppercase tracking-[0.2em] text-fire-orange">Legal</p>
                  <h1 className="font-display text-[2rem] font-extrabold leading-[0.9] tracking-tight text-ink">Privacy Policy</h1>
                </div>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-glow" style={{ background: 'linear-gradient(100deg, var(--fire-red), var(--fire-amber))' }}>
                <ShieldCheck size={24} />
              </div>
            </div>

            {/* Content card */}
            <div className="space-y-10 rounded-[32px] border border-black/5 bg-white p-7 shadow-soft md:p-10">
              <section className="space-y-4">
                <div className="flex items-center gap-3 text-fire-orange">
                  <Globe size={22} />
                  <h2 className="font-display text-xl font-extrabold tracking-tight text-ink">Introduction</h2>
                </div>
                <p className="font-medium leading-relaxed text-ink/65">
                  Welcome to BlinkCar. We value your privacy and are committed to protecting your personal data.
                  This Privacy Policy explains how we collect, use, and safeguard your information when you use our mobile application and services.
                </p>
                <p className="text-sm font-medium text-ink/40">Last updated: March 26, 2024</p>
              </section>

              <div className="h-px bg-black/5" />

              <section className="space-y-4">
                <div className="flex items-center gap-3 text-fire-orange">
                  <Lock size={22} />
                  <h2 className="font-display text-xl font-extrabold tracking-tight text-ink">Data we collect</h2>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {dataCards.map((card) => (
                    <div key={card.title} className="rounded-2xl border border-black/5 bg-paper p-4">
                      <h3 className="mb-2 font-display font-bold text-ink">{card.title}</h3>
                      <p className="text-sm font-medium text-ink/55">{card.text}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-center gap-3 text-fire-orange">
                  <Eye size={22} />
                  <h2 className="font-display text-xl font-extrabold tracking-tight text-ink">How we use your data</h2>
                </div>
                <ul className="space-y-3">
                  {usageList.map((item) => (
                    <li key={item} className="flex items-center gap-3 font-medium text-ink/65">
                      <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-fire-orange" />
                      {item}
                    </li>
                  ))}
                </ul>
              </section>

              <section className="space-y-4">
                <div className="flex items-center gap-3 text-fire-orange">
                  <FileText size={22} />
                  <h2 className="font-display text-xl font-extrabold tracking-tight text-ink">Your rights</h2>
                </div>
                <p className="font-medium leading-relaxed text-ink/65">
                  You have the right to access, update, or delete your personal information directly within the app settings.
                  If you choose to delete your account, all personal data will be removed or anonymized as per our data retention policy.
                </p>
                <div className="rounded-2xl border border-primary-100 bg-primary-50/60 p-4">
                  <p className="text-sm font-medium text-ink/70">
                    <strong className="font-display font-bold text-ink">Note:</strong> We do not sell your personal data to third parties for marketing purposes.
                  </p>
                </div>
              </section>

              <div className="pt-2 text-center">
                <p className="mb-4 text-sm font-medium text-ink/40">Questions about our policy?</p>
                <a
                  href="mailto:support@riderapp.local"
                  className="inline-block rounded-2xl border border-black/10 bg-paper px-8 py-3 font-display font-bold text-ink transition hover:bg-paper-dim"
                >
                  Contact Privacy Team
                </a>
              </div>
            </div>

            <div className="mt-10 text-center text-xs font-medium text-ink/35">
              <p>© 2024 BlinkCar Technologies. All rights reserved.</p>
            </div>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default PrivacyPolicyPage;
