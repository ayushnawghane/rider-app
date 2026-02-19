import { useEffect, useState } from 'react';
import { useHistory } from 'react-router';
import { IonContent, IonPage } from '@ionic/react';
import { useAuth } from '../../context/AuthContext';
import { UserButton } from '@clerk/clerk-react';
import { 
  Search, 
  MapPin, 
  Clock, 
  Users, 
  Plus, 
  Car, 
  Award, 
  HelpCircle, 
  ArrowRightLeft,
  Phone,
  MessageCircle,
  Map,
  Bell,
  Star,
  Navigation
} from 'lucide-react';
import type { PublishedRide, UserStats } from '../../types';

interface Location {
  address: string;
  lat: number;
  lng: number;
}

const HomePage = () => {
  const { user, isClerkLoaded } = useAuth();
  const history = useHistory();
  
  const [pickup, setPickup] = useState<Location | null>(null);
  const [dropoff, setDropoff] = useState<Location | null>(null);
  const [departureTime, setDepartureTime] = useState<string>('');
  const [passengerCount, setPassengerCount] = useState<number>(1);
  const [activeRide] = useState<PublishedRide | null>(null);
  const [userStats] = useState<UserStats>({
    level: 12,
    points: 2450,
    ridesTaken: 15,
    ridesPublished: 8,
    rating: 4.9
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set default time to current time + 30 minutes
    const now = new Date();
    now.setMinutes(now.getMinutes() + 30);
    setDepartureTime(now.toISOString().slice(0, 16));
    
    setTimeout(() => setLoading(false), 1000);
  }, []);

  const handleSwapLocations = () => {
    const temp = pickup;
    setPickup(dropoff);
    setDropoff(temp);
  };

  const handleFindDrivers = () => {
    history.push('/find-ride', { pickup, dropoff, departureTime, passengerCount });
  };

  const popularRoutes = [
    { city: 'Mumbai', image: 'https://images.unsplash.com/photo-1567157577867-05ccb1388e66?w=400&h=300&fit=crop', startingPrice: 150 },
    { city: 'Pune', image: 'https://images.unsplash.com/photo-1595658658481-d53d3f999875?w=400&h=300&fit=crop', startingPrice: 120 },
    { city: 'Delhi', image: 'https://images.unsplash.com/photo-1587474260584-136574528ed5?w=400&h=300&fit=crop', startingPrice: 200 },
  ];

  if (!isClerkLoaded || loading) {
    return (
      <IonPage>
        <IonContent className="bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700">
          <div className="min-h-screen flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent" />
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonContent className="bg-gray-50">
        <div className="h-screen overflow-y-auto bg-gray-50 pb-24" style={{ WebkitOverflowScrolling: 'touch' }}>
      {/* Orange Header Section */}
      <div className="bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 pt-12 pb-6 px-4">
        {/* Top Row: Notifications & Profile */}
        <div className="flex justify-end items-center gap-3 mb-4">
          <button className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center relative">
            <Bell className="w-5 h-5 text-white" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />
          </button>
          <div className="w-10 h-10 rounded-xl overflow-hidden border-2 border-white/30">
            <UserButton afterSignOutUrl="/login" />
          </div>
        </div>

        {/* Greeting & Location */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">
            Hi, {user?.firstName || 'Rider'}
          </h1>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1.5">
              <MapPin className="w-4 h-4 text-white" />
              <span className="text-white text-sm font-medium">Mumbai, IN</span>
            </div>
            <div className="flex items-center gap-1.5 bg-yellow-500/90 rounded-full px-3 py-1.5">
              <Star className="w-4 h-4 text-white fill-white" />
              <span className="text-white text-sm font-bold">Lvl {userStats.level}</span>
            </div>
          </div>
        </div>

        {/* Car Illustration */}
        <div className="absolute top-16 right-4 opacity-20">
          <Car className="w-32 h-32 text-white" />
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 -mt-4">
        {/* Search & Route Card */}
        <div className="bg-white rounded-2xl shadow-lg p-4 mb-4">
          {/* Search Bar */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search destinations..."
              className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-xl text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* From/To Selection */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1">
              <label className="text-xs text-gray-500 mb-1 block">From</label>
              <button 
                onClick={() => history.push('/select-location', { type: 'pickup' })}
                className="w-full p-3 border-2 border-primary-100 rounded-xl text-left hover:border-primary-300 transition-colors"
              >
                <span className="text-primary-600 font-semibold">
                  {pickup?.address || 'Pick Up'}
                </span>
              </button>
            </div>
            
            <button 
              onClick={handleSwapLocations}
              className="mt-5 w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
            >
              <ArrowRightLeft className="w-5 h-5 text-gray-600" />
            </button>
            
            <div className="flex-1">
              <label className="text-xs text-gray-500 mb-1 block text-right">To</label>
              <button 
                onClick={() => history.push('/select-location', { type: 'dropoff' })}
                className="w-full p-3 border-2 border-primary-100 rounded-xl text-right hover:border-primary-300 transition-colors"
              >
                <span className="text-primary-600 font-semibold">
                  {dropoff?.address || 'Drop Off'}
                </span>
              </button>
            </div>
          </div>

          {/* Time & Passengers */}
          <div className="space-y-3 mb-4">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <Clock className="w-5 h-5 text-primary-500" />
              <input
                type="datetime-local"
                value={departureTime}
                onChange={(e) => setDepartureTime(e.target.value)}
                className="flex-1 bg-transparent text-gray-700 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <Users className="w-5 h-5 text-primary-500" />
              <div className="flex items-center gap-4 flex-1">
                <button 
                  onClick={() => setPassengerCount(Math.max(1, passengerCount - 1))}
                  className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100"
                >
                  -
                </button>
                <span className="text-gray-700 font-medium w-6 text-center">{passengerCount.toString().padStart(2, '0')}</span>
                <button 
                  onClick={() => setPassengerCount(Math.min(6, passengerCount + 1))}
                  className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Find Drivers Button */}
          <button
            onClick={handleFindDrivers}
            className="w-full py-4 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-xl shadow-lg shadow-primary-500/30 transition-all active:scale-95"
          >
            Find Drivers
          </button>
        </div>

        {/* Active Ride Card */}
        {activeRide && (
          <div className="bg-white rounded-2xl shadow-lg p-4 mb-4">
            <div className="flex items-start gap-4 mb-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-gray-200 overflow-hidden">
                  <img 
                    src={activeRide.driver?.avatar || 'https://via.placeholder.com/64'} 
                    alt="Driver" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
                  <Star className="w-3 h-3 text-white fill-white" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{activeRide.driver?.name || 'Rahul S'}</h3>
                <div className="flex items-center gap-1 text-yellow-500">
                  <Star className="w-4 h-4 fill-current" />
                  <span className="text-sm font-medium">{activeRide.driver?.rating || '4.9'}</span>
                </div>
                <p className="text-primary-600 font-medium mt-1">
                  Driver arriving in <span className="font-bold">3 mins</span>
                </p>
                <div className="w-full h-1.5 bg-gray-100 rounded-full mt-2">
                  <div className="w-2/3 h-full bg-primary-500 rounded-full" />
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
              <span>Pickup : {activeRide.startLocation}</span>
              <span className="text-gray-400">|</span>
              <span>Drop Off : {activeRide.endLocation}</span>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              <button className="flex items-center justify-center gap-2 py-2.5 bg-primary-500 text-white rounded-xl font-medium">
                <Phone className="w-4 h-4" />
                Call
              </button>
              <button className="flex items-center justify-center gap-2 py-2.5 border-2 border-primary-500 text-primary-600 rounded-xl font-medium">
                <MessageCircle className="w-4 h-4" />
                Message
              </button>
              <button className="flex items-center justify-center gap-2 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium">
                <Map className="w-4 h-4" />
                View Map
              </button>
            </div>
          </div>
        )}

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          <button 
            onClick={() => history.push('/publish-ride')}
            className="flex flex-col items-center gap-2"
          >
            <div className="w-14 h-14 bg-primary-100 rounded-2xl flex items-center justify-center">
              <div className="relative">
                <Car className="w-7 h-7 text-primary-600" />
                <Plus className="w-4 h-4 text-primary-600 absolute -top-1 -right-1" />
              </div>
            </div>
            <span className="text-xs font-medium text-gray-700">Publish Ride</span>
          </button>
          
          <button 
            onClick={() => history.push('/find-ride')}
            className="flex flex-col items-center gap-2"
          >
            <div className="w-14 h-14 bg-primary-100 rounded-2xl flex items-center justify-center">
              <div className="relative">
                <Car className="w-7 h-7 text-primary-600" />
                <MapPin className="w-4 h-4 text-primary-600 absolute -top-1 -right-1" />
              </div>
            </div>
            <span className="text-xs font-medium text-gray-700">Find Ride</span>
          </button>
          
          <button 
            onClick={() => history.push('/rewards')}
            className="flex flex-col items-center gap-2"
          >
            <div className="w-14 h-14 bg-primary-100 rounded-2xl flex items-center justify-center">
              <Award className="w-7 h-7 text-primary-600" />
            </div>
            <span className="text-xs font-medium text-gray-700">Reward Points</span>
          </button>
          
          <button 
            onClick={() => history.push('/support')}
            className="flex flex-col items-center gap-2"
          >
            <div className="w-14 h-14 bg-primary-100 rounded-2xl flex items-center justify-center">
              <HelpCircle className="w-7 h-7 text-primary-600" />
            </div>
            <span className="text-xs font-medium text-gray-700">Help</span>
          </button>
        </div>

        {/* Main Routes Section */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Main Routes</h2>
          <p className="text-gray-500 text-sm mb-4">Select the best way to travel</p>
          
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {popularRoutes.map((route) => (
              <button 
                key={route.city}
                className="flex-shrink-0 w-40"
                onClick={() => setDropoff({ address: route.city, lat: 0, lng: 0 })}
              >
                <div className="w-full h-24 rounded-xl overflow-hidden mb-2">
                  <img 
                    src={route.image} 
                    alt={route.city}
                    className="w-full h-full object-cover"
                  />
                </div>
                <h3 className="font-semibold text-gray-900">{route.city}</h3>
                <p className="text-xs text-gray-500">Starting at ₹{route.startingPrice}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Promotional Banner */}
        <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl p-5 text-white mb-6">
          <h3 className="text-xl font-bold mb-2">Earn whilst you travel</h3>
          <p className="text-primary-100 text-sm mb-4">
            Get 2x points on your first 3 rides this month
          </p>
          <button 
            onClick={() => history.push('/rewards')}
            className="bg-white text-primary-600 px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-primary-50 transition-colors"
          >
            See Rewards
          </button>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-2 safe-area-bottom">
        <div className="flex justify-around items-center max-w-lg mx-auto">
          <button className="flex flex-col items-center gap-1 p-2 text-primary-600">
            <Navigation className="w-6 h-6" />
            <span className="text-xs font-medium">Home</span>
          </button>
          <button 
            onClick={() => history.push('/publish-ride')}
            className="flex flex-col items-center gap-1 p-2 text-gray-400 hover:text-primary-600"
          >
            <Plus className="w-6 h-6" />
            <span className="text-xs font-medium">Publish</span>
          </button>
          <button 
            onClick={() => history.push('/find-ride')}
            className="flex flex-col items-center gap-1 p-2 text-gray-400 hover:text-primary-600"
          >
            <Search className="w-6 h-6" />
            <span className="text-xs font-medium">Find</span>
          </button>
          <button 
            onClick={() => history.push('/rewards')}
            className="flex flex-col items-center gap-1 p-2 text-gray-400 hover:text-primary-600"
          >
            <Award className="w-6 h-6" />
            <span className="text-xs font-medium">Rewards</span>
          </button>
          <button 
            onClick={() => history.push('/profile')}
            className="flex flex-col items-center gap-1 p-2 text-gray-400 hover:text-primary-600"
          >
            <Users className="w-6 h-6" />
            <span className="text-xs font-medium">Profile</span>
          </button>
        </div>
      </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default HomePage;
