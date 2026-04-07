import React from 'react';
import { useHistory } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Lock, Eye, FileText, Globe } from 'lucide-react';
import { IonContent, IonPage } from '@ionic/react';

const PrivacyPolicyPage: React.FC = () => {
  const history = useHistory();

  return (
    <IonPage>
      <IonContent className="ion-padding">
        <div className="min-h-screen bg-slate-50 pb-12">
          {/* Header */}
          <div className="bg-orange-600 px-6 pt-12 pb-20 text-white">
            <div className="max-w-3xl mx-auto flex items-center justify-between">
              <button 
                onClick={() => history.goBack()}
                className="p-2 rounded-xl bg-white/10 backdrop-blur hover:bg-white/20 transition"
              >
                <ArrowLeft size={24} />
              </button>
              <h1 className="text-3xl font-bold">Privacy Policy</h1>
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                <ShieldCheck size={24} />
              </div>
            </div>
          </div>

          {/* Content Card */}
          <div className="max-w-3xl mx-auto -mt-10 px-4">
            <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8 md:p-12 space-y-10">
              
              <section className="space-y-4">
                <div className="flex items-center gap-3 text-orange-600">
                  <Globe size={24} />
                  <h2 className="text-xl font-bold">Introduction</h2>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  Welcome to BlinkCar. We value your privacy and are committed to protecting your personal data. 
                  This Privacy Policy explains how we collect, use, and safeguard your information when you use our mobile application and services.
                </p>
                <p className="text-slate-500 text-sm">Last updated: March 26, 2024</p>
              </section>

              <div className="h-px bg-slate-100" />

              <section className="space-y-4">
                <div className="flex items-center gap-3 text-orange-600">
                  <Lock size={24} />
                  <h2 className="text-xl font-bold">Data We Collect</h2>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <h3 className="font-bold text-slate-800 mb-2">Personal info</h3>
                    <p className="text-sm text-slate-600">Name, email address, phone number, and profile picture provided during registration.</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <h3 className="font-bold text-slate-800 mb-2">Location</h3>
                    <p className="text-sm text-slate-600">Real-time GPS coordinates to facilitate ride matching and safety tracking.</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <h3 className="font-bold text-slate-800 mb-2">Vehicle data</h3>
                    <p className="text-sm text-slate-600">Car make, model, and registration number for driver verification.</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <h3 className="font-bold text-slate-800 mb-2">Usage data</h3>
                    <p className="text-sm text-slate-600">Information about how you interact with our services and ride history.</p>
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-center gap-3 text-orange-600">
                  <Eye size={24} />
                  <h2 className="text-xl font-bold">How We Use Your Data</h2>
                </div>
                <ul className="space-y-3">
                  {[
                    "To provide and maintain our Service",
                    "To match riders and drivers based on location",
                    "To ensure safety and security of our users",
                    "To process payments and rewards",
                    "To notify you about changes to our Service"
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-slate-600">
                      <div className="w-1.5 h-1.5 bg-orange-400 rounded-full" />
                      {item}
                    </li>
                  ))}
                </ul>
              </section>

              <section className="space-y-4">
                <div className="flex items-center gap-3 text-orange-600">
                  <FileText size={24} />
                  <h2 className="text-xl font-bold">Your Rights</h2>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  You have the right to access, update, or delete your personal information directly within the app settings. 
                  If you choose to delete your account, all personal data will be removed or anonymized as per our data retention policy.
                </p>
                <div className="p-4 bg-orange-50 border border-orange-100 rounded-2xl">
                  <p className="text-sm text-orange-800">
                    <strong>Note:</strong> We do not sell your personal data to third parties for marketing purposes.
                  </p>
                </div>
              </section>

              <div className="pt-6 text-center">
                <p className="text-sm text-slate-400 mb-4">Questions about our policy?</p>
                <a href="mailto:support@riderapp.local" className="px-8 py-3 bg-slate-100 text-slate-700 font-bold rounded-2xl hover:bg-slate-200 transition inline-block">
                  Contact Privacy Team
                </a>
              </div>

            </div>
          </div>

          <div className="mt-12 text-center text-slate-400 text-xs">
            <p>© 2024 BlinkCar Technologies. All rights reserved.</p>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default PrivacyPolicyPage;
