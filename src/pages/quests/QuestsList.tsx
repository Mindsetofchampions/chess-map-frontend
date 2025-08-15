/**
 * Quests List Page
 * 
 * Displays approved and active MCQ quests for students with
 * filtering and quest launch capabilities.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { Play, HelpCircle, Award, Search, Filter, RefreshCw, ArrowLeft } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/ToastProvider';
import { PERSONA_GIF, getPersonaInfo } from '../../assets/personas';
import GlassContainer from '../../components/GlassContainer';
import type { Quest } from '../../types/backend';

/**
 * Quests List Component
 * 
 * Features:
 * - Loads approved MCQ quests via RLS-protected query
 * - Search and filter functionality
 * - Quest cards with play buttons
 * - Loading skeletons and error handling
 * - Real-time updates via subscriptions
 */
const QuestsList: React.FC = () => {
  const navigate = useNavigate();
  const { showError } = useToast();
  
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPersona, setFilterPersona] = useState<string>('all');

  /**
   * Fetch quests from Supabase
   * Only loads MCQ quests that are approved and active (RLS enforced)
   */
  const fetchQuests = useCallback(async () => {
    setLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('quests')
        .select('id, title, description, status, active, reward_coins, qtype, config, attribute_id, created_at')
        .eq('qtype', 'mcq') // Only MCQ quests for now
        .order('created_at', { ascending: false });
      
      if (error) {
        throw new Error(error.message);
      }
      
      setQuests(data || []);
    } catch (error: any) {
      console.error('Failed to fetch quests:', error);
      showError('Failed to load quests', error.message);
    } finally {
      setLoading(false);
    }
  }, [showError]);

  /**
   * Filter quests based on search and persona
   */
  const filteredQuests = quests.filter(quest => {
    const matchesSearch = !searchTerm || 
      quest.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quest.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPersona = filterPersona === 'all'; // Simplified since we don't have persona_key
    
    return matchesSearch && matchesPersona;
  });

  /**
   * Get persona display info
   */
  const getPersonaForAttribute = (attributeId?: string) => {
    // Map attribute IDs to personas - this would need actual attribute data from your DB
    const attributePersonaMap: Record<string, string> = {
      'character': 'hootie',
      'health': 'kittykat', 
      'exploration': 'gino',
      'stem': 'hammer',
      'stewardship': 'badge'
    };
    
    const personaKey = attributePersonaMap[attributeId || ''] || 'hootie'; // Default fallback
    return personaKey;
  };

  /**
   * Handle quest play
   */
  const handlePlayQuest = (questId: string) => {
    navigate(`/quests/${questId}`);
  };

  /**
   * Initialize data and subscriptions
   */
  useEffect(() => {
    fetchQuests();

    // Set up real-time subscription for quest updates
    const subscription = supabase
      .channel('quests_channel')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'quests' },
        () => {
          console.log('Quests updated, refreshing...');
          fetchQuests();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchQuests]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-primary via-dark-secondary to-dark-tertiary">
      <div className="container mx-auto max-w-7xl p-6">
        
        {/* Header */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-4xl font-bold text-white mb-4">Available Quests</h1>
          <p className="text-gray-200 text-lg">Choose your learning adventure and start earning coins!</p>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <GlassContainer variant="card" className="mb-8">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              
              {/* Search */}
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search quests..."
                    className="w-full pl-10 pr-4 py-2 bg-glass border-glass rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-electric-blue-400"
                  />
                </div>
              </div>

              {/* Persona Filter */}
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <select
                  value={filterPersona}
                  onChange={(e) => setFilterPersona(e.target.value)}
                  className="bg-glass border-glass rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-electric-blue-400"
                >
                  <option value="all">All Personas</option>
                  <option value="hootie">Hootie the Owl</option>
                  <option value="kittykat">Kitty Kat</option>
                  <option value="gino">Gino the Dog</option>
                  <option value="hammer">Hammer the Robot</option>
                  <option value="badge">MOC Badge</option>
                </select>
              </div>

              {/* Refresh */}
              <button
                onClick={fetchQuests}
                disabled={loading}
                className="p-2 bg-glass border-glass hover:bg-glass-dark text-gray-300 hover:text-white rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </GlassContainer>
        </motion.div>

        {/* Loading State */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="bg-glass border-glass rounded-xl p-6 animate-pulse">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-gray-600 rounded-full"></div>
                  <div className="space-y-2">
                    <div className="w-32 h-4 bg-gray-600 rounded"></div>
                    <div className="w-24 h-3 bg-gray-600 rounded"></div>
                  </div>
                </div>
                <div className="space-y-2 mb-4">
                  <div className="w-full h-3 bg-gray-600 rounded"></div>
                  <div className="w-3/4 h-3 bg-gray-600 rounded"></div>
                </div>
                <div className="w-full h-10 bg-gray-600 rounded"></div>
              </div>
            ))}
          </div>
        ) : filteredQuests.length === 0 ? (
          /* Empty State */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <GlassContainer variant="card" className="text-center py-12">
              <HelpCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">
                {searchTerm || filterPersona !== 'all' ? 'No Matching Quests' : 'No Quests Available'}
              </h3>
              <p className="text-gray-300 mb-6">
                {searchTerm || filterPersona !== 'all' 
                  ? 'Try adjusting your search or filter criteria'
                  : 'Check back later for new learning adventures!'
                }
              </p>
              {(!searchTerm && filterPersona === 'all') && (
                <Link
                  to="/map"
                  className="btn-esports inline-flex items-center gap-2"
                >
                  <MapPin className="w-4 h-4" />
                  Explore Map
                </Link>
              )}
            </GlassContainer>
          </motion.div>
        ) : (
          /* Quests Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Dashboard Navigation Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0 }}
            >
              <Link
                to="/dashboard"
                className="h-full block"
              >
                <GlassContainer variant="card" className="h-full flex flex-col items-center justify-center text-center p-8 hover:bg-glass-dark transition-all duration-300 hover:scale-105 hover:-translate-y-2 cursor-pointer">
                  <div className="w-16 h-16 bg-gradient-to-br from-electric-blue-400 to-electric-blue-600 rounded-full flex items-center justify-center mb-4">
                    <ArrowLeft className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">Back to Dashboard</h3>
                  <p className="text-gray-300 text-sm">Return to your learning hub</p>
                  <div className="mt-4 flex items-center gap-2 text-electric-blue-400 text-sm font-medium">
                    <span>Go Back</span>
                    <ArrowLeft className="w-4 h-4" />
                  </div>
                </GlassContainer>
              </Link>
            </motion.div>

            <AnimatePresence>
              {filteredQuests.map((quest, index) => {
                const personaKey = getPersonaForAttribute(quest.attribute_id);
                const personaInfo = getPersonaInfo(personaKey as any);
                const spriteUrl = PERSONA_GIF[personaKey as keyof typeof PERSONA_GIF];
                
                return (
                  <motion.div
                    key={quest.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ scale: 1.02, y: -4 }}
                  >
                    <GlassContainer variant="card" className="h-full flex flex-col">
                      
                      {/* Quest Header */}
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-full bg-glass-dark border-glass-light p-2 flex items-center justify-center">
                          <img
                            src={spriteUrl}
                            alt={`${personaInfo.name} sprite`}
                            className="w-8 h-8 object-contain"
                            style={{ imageRendering: 'pixelated' }}
                            draggable={false}
                            onError={(e) => {
                              // Fallback to emoji if sprite fails to load
                              const target = e.currentTarget;
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent && !parent.querySelector('.emoji-fallback')) {
                                const fallback = document.createElement('div');
                                fallback.className = 'emoji-fallback text-2xl';
                                fallback.textContent = personaInfo.emoji;
                                parent.appendChild(fallback);
                              }
                            }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-white text-lg leading-tight">
                            {quest.title}
                          </h3>
                          <p className="text-sm text-gray-300">
                            {personaInfo.name}
                          </p>
                        </div>
                      </div>

                      {/* Quest Description */}
                      <p className="text-gray-200 text-sm mb-4 flex-1 leading-relaxed">
                        {quest.description || 'No description provided'}
                      </p>

                      {/* Quest Metadata */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-1 text-yellow-400">
                          <Award className="w-4 h-4" />
                          <span className="font-semibold">{quest.reward_coins} coins</span>
                        </div>
                        
                        <div className="flex items-center gap-1 text-gray-300">
                          <HelpCircle className="w-4 h-4" />
                          <span className="text-sm">MCQ</span>
                        </div>
                      </div>

                      {/* Play Button */}
                      <motion.button
                        onClick={() => handlePlayQuest(quest.id)}
                        className="w-full btn-esports flex items-center justify-center gap-2"
                        data-testid={`btn-play-${quest.id}`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Play className="w-4 h-4" />
                        Start Quest
                      </motion.button>
                    </GlassContainer>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestsList;