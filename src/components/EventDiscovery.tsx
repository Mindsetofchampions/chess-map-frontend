import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  searchPublicEvents, 
  getLocalEvents, 
  getUpcomingEvents,
  normalizeEventData 
} from '../services/eventService';
import { PublicEvent, PersonaKey } from '../types';
import { 
  Search,
  Calendar,
  MapPin,
  ExternalLink,
  Clock,
  Users,
  RefreshCw,
  Filter,
  X
} from 'lucide-react';

/**
 * Props for EventDiscovery component
 */
interface EventDiscoveryProps {
  personaKey?: PersonaKey;
  userLocation?: { lat: number; lng: number };
  className?: string;
}

/**
 * Props for EventCard component
 */
interface EventCardProps {
  event: PublicEvent;
}

/**
 * Individual Event Card Component
 */
const EventCard: React.FC<EventCardProps> = ({ event }) => {
  const eventDate = event.starts_at ? new Date(event.starts_at) : null;
  const isUpcoming = eventDate ? eventDate > new Date() : false;
  const isPast = eventDate ? eventDate < new Date() : false;

  return (
    <motion.div
      className="bg-glass border-glass rounded-xl p-4 hover:bg-glass-dark transition-all duration-300 shadow-lg"
      whileHover={{ scale: 1.02, y: -2 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-semibold text-lg text-white leading-tight line-clamp-2 flex-1">
          {event.title}
        </h3>
        <div className="ml-3 flex-shrink-0">
          <span className={`px-2 py-1 text-xs rounded-full font-medium ${
            isUpcoming ? 'bg-cyber-green-500/20 border border-cyber-green-500/30 text-cyber-green-300' :
            isPast ? 'bg-gray-500/20 border border-gray-500/30 text-gray-400' :
            'bg-electric-blue-500/20 border border-electric-blue-500/30 text-electric-blue-300'
          }`}>
            {isUpcoming ? 'Upcoming' : isPast ? 'Past' : 'Event'}
          </span>
        </div>
      </div>
      
      {event.description && (
        <p className="text-gray-200 text-sm mb-4 leading-relaxed line-clamp-3">
          {event.description}
        </p>
      )}
      
      <div className="space-y-2 text-sm text-gray-300">
        {eventDate && (
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-neon-purple-400 flex-shrink-0" />
            <span>{eventDate.toLocaleDateString()} at {eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        )}
        
        {event.location && (
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-electric-blue-400 flex-shrink-0" />
            <span className="line-clamp-1">{event.location}</span>
          </div>
        )}
        
        {event.persona_key && (
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-cyber-green-400 flex-shrink-0" />
            <span className="capitalize">{event.persona_key} content</span>
          </div>
        )}
      </div>
      
      {event.url && (
        <div className="mt-4 pt-3 border-t border-glass">
          <a
            href={event.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-electric-blue-400 hover:text-electric-blue-300 text-sm font-medium transition-colors duration-200"
          >
            <ExternalLink className="w-4 h-4" />
            View Event Details
          </a>
        </div>
      )}
    </motion.div>
  );
};

/**
 * Event Discovery Component
 * 
 * Features:
 * - Search and filter events by location and persona
 * - Displays upcoming and relevant events
 * - Safe external links with security validation
 * - Mobile-responsive grid layout
 */
const EventDiscovery: React.FC<EventDiscoveryProps> = ({
  personaKey,
  userLocation,
  className = ''
}) => {
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'upcoming' | 'local'>('upcoming');

  /**
   * Search events with current parameters
   */
  const searchEvents = useCallback(async (query?: string, filterType?: string) => {
    setLoading(true);
    setError(null);

    try {
      let results: PublicEvent[] = [];
      const currentFilter = filterType || activeFilter;
      const currentQuery = query !== undefined ? query : searchQuery;

      switch (currentFilter) {
        case 'upcoming':
          results = await getUpcomingEvents(20);
          break;
          
        case 'local':
          if (userLocation) {
            results = await getLocalEvents(
              userLocation.lat,
              userLocation.lng,
              25
            );
          } else {
            // Default to Philadelphia area
            results = await getLocalEvents(39.9526, -75.1652, 25);
          }
          break;
          
        case 'all':
        default:
          results = await searchPublicEvents({
            q: currentQuery,
            lat: userLocation?.lat,
            lng: userLocation?.lng,
            radius: 25,
            personaKey,
            limit: 30
          });
          break;
      }

      // Additional text filtering if search query provided
      if (currentQuery.trim()) {
        const queryLower = currentQuery.toLowerCase();
        results = results.filter(event =>
          event.title.toLowerCase().includes(queryLower) ||
          (event.description && event.description.toLowerCase().includes(queryLower)) ||
          (event.location && event.location.toLowerCase().includes(queryLower))
        );
      }

      setEvents(results);
    } catch (err) {
      setError('Failed to load events. Please try again.');
      console.error('Event search error:', err);
    } finally {
      setLoading(false);
    }
  }, [personaKey, userLocation, activeFilter, searchQuery]);

  /**
   * Initialize with upcoming events
   */
  useEffect(() => {
    searchEvents();
  }, [searchEvents]);

  /**
   * Handle search form submission
   */
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchEvents(searchQuery);
  };

  /**
   * Handle filter change
   */
  const handleFilterChange = (filter: 'all' | 'upcoming' | 'local') => {
    setActiveFilter(filter);
    searchEvents(searchQuery, filter);
  };

  return (
    <div className={`max-w-6xl mx-auto ${className}`}>
      {/* Header */}
      <div className="mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl font-bold text-white mb-4">
            Discover Local Events
            {personaKey && (
              <span className="text-lg font-normal text-gray-300 ml-3">
                for {personaKey}
              </span>
            )}
          </h2>
          
          <p className="text-gray-200 text-lg">
            Find educational events and activities in your area
          </p>
        </motion.div>
      </div>

      {/* Search and Filters */}
      <motion.div
        className="mb-8 space-y-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for events, topics, or locations..."
              className="w-full pl-10 pr-4 py-3 bg-glass border-glass rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-electric-blue-400 focus:border-transparent transition-all duration-200"
            />
          </div>
          <motion.button
            type="submit"
            disabled={loading}
            className="bg-electric-blue-500 hover:bg-electric-blue-600 disabled:bg-gray-500 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 min-w-touch touch-manipulation"
            whileHover={!loading ? { scale: 1.02 } : {}}
            whileTap={!loading ? { scale: 0.98 } : {}}
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              'Search'
            )}
          </motion.button>
        </form>

        {/* Filter Buttons */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {[
            { key: 'upcoming', label: 'Upcoming', icon: Clock },
            { key: 'local', label: 'Nearby', icon: MapPin },
            { key: 'all', label: 'All Events', icon: Calendar }
          ].map(filter => (
            <motion.button
              key={filter.key}
              onClick={() => handleFilterChange(filter.key as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-200 whitespace-nowrap min-h-touch touch-manipulation ${
                activeFilter === filter.key
                  ? 'bg-electric-blue-500/30 border border-electric-blue-500/50 text-electric-blue-300'
                  : 'bg-glass border-glass text-gray-300 hover:bg-glass-dark hover:text-white'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <filter.icon className="w-4 h-4" />
              <span className="text-sm">{filter.label}</span>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Error Display */}
      <AnimatePresence>
        {error && (
          <motion.div
            className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-xl flex items-center gap-3"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <X className="w-5 h-5 text-red-300 flex-shrink-0" />
            <p className="text-red-200">{error}</p>
            <button
              onClick={() => setError(null)}
              className="ml-auto p-1 hover:bg-red-500/20 rounded"
            >
              <X className="w-4 h-4 text-red-300" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading State */}
      {loading && (
        <motion.div
          className="flex items-center justify-center py-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-electric-blue-400 mx-auto mb-4"></div>
            <p className="text-gray-300">Searching for events...</p>
          </div>
        </motion.div>
      )}

      {/* Empty State */}
      {!loading && events.length === 0 && !error && (
        <motion.div
          className="text-center py-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="w-20 h-20 bg-glass border-glass rounded-full flex items-center justify-center mx-auto mb-6">
            <Calendar className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">No Events Found</h3>
          <p className="text-gray-300 mb-6">
            {searchQuery 
              ? `No events found for "${searchQuery}". Try adjusting your search terms.`
              : 'No events found for the current filters. Try expanding your search area or changing filters.'
            }
          </p>
          <motion.button
            onClick={() => searchEvents('')}
            className="btn-esports flex items-center gap-2 mx-auto"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <RefreshCw className="w-4 h-4" />
            Refresh Events
          </motion.button>
        </motion.div>
      )}

      {/* Events Grid */}
      {!loading && events.length > 0 && (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {events.map((event, index) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <EventCard event={event} />
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Results Summary */}
      {!loading && events.length > 0 && (
        <motion.div
          className="mt-8 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <p className="text-gray-300 text-sm">
            Showing {events.length} event{events.length !== 1 ? 's' : ''}
            {searchQuery && ` for "${searchQuery}"`}
            {userLocation && ` near your location`}
          </p>
        </motion.div>
      )}
    </div>
  );
};

export default EventDiscovery;