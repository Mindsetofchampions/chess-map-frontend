/**
 * Student Quest Map Overlay
 * 
 * Displays approved quests as interactive bubbles on the map
 * with persona-specific styling and quest interaction.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuests } from '../../hooks/useQuests';
import { useAuth } from '../../contexts/AuthContext';
import { createPersonaMarker } from '../../lib/sprites';
import QuestPlayModal from '../../modals/QuestPlayModal';
import type { Quest, QuestSubmission } from '../../types/quest';

/**
 * Props for QuestMapOverlay component
 */
interface QuestMapOverlayProps {
  /** Mapbox map instance */
  map: mapboxgl.Map | null;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Quest marker data for map display
 */
interface QuestMarker {
  quest: Quest;
  marker: mapboxgl.Marker;
  element: HTMLElement;
}

/**
 * Student Quest Map Overlay Component
 * 
 * Features:
 * - Real-time quest loading from approved quests
 * - Persona-specific bubble styling and animations
 * - Interactive quest markers with click handlers
 * - Quest completion tracking and visual feedback
 * - Mobile-responsive quest interaction
 */
const QuestMapOverlay: React.FC<QuestMapOverlayProps> = ({
  map,
  className = ''
}) => {
  const { user } = useAuth();
  const { mapQuests, refreshMapQuests, getUserSubmission } = useQuests();
  
  // Component state
  const [questMarkers, setQuestMarkers] = useState<QuestMarker[]>([]);
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);
  const [showQuestModal, setShowQuestModal] = useState(false);
  const [completedQuests, setCompletedQuests] = useState<Set<string>>(new Set());

  /**
   * Get persona styling for quest bubbles
   */
  const getPersonaStyle = useCallback((personaKey: string) => {
    const styles = {
      hootie: { color: '#8B5CF6', emoji: '🦉' },
      kittykat: { color: '#10B981', emoji: '🐱' },
      gino: { color: '#F59E0B', emoji: '🐕' },
      hammer: { color: '#3B82F6', emoji: '🤖' },
      badge: { color: '#EF4444', emoji: '🏛️' }
    };
    
    return styles[personaKey as keyof typeof styles] || { color: '#6B7280', emoji: '❓' };
  }, []);

  /**
   * Create quest marker element
   */
  const createQuestMarkerElement = useCallback((quest: Quest): HTMLElement => {
    const style = getPersonaStyle(quest.persona_key);
    const isCompleted = completedQuests.has(quest.id);
    
    const element = document.createElement('div');
    element.className = 'quest-marker';
    element.style.cssText = `
      width: 60px;
      height: 60px;
      border-radius: 50%;
      border: 3px solid rgba(255, 255, 255, 0.8);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      cursor: pointer;
      background-color: ${style.color}80;
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      transition: all 0.3s ease;
      position: relative;
      ${isCompleted ? 'opacity: 0.6; filter: grayscale(50%);' : ''}
    `;
    
    element.innerHTML = style.emoji;
    element.title = `${quest.title} - ${quest.reward_coins} coins`;
    
    // Add hover effects
    element.addEventListener('mouseenter', () => {
      element.style.transform = 'scale(1.2)';
      element.style.zIndex = '1000';
      element.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.4)';
    });
    
    element.addEventListener('mouseleave', () => {
      element.style.transform = 'scale(1)';
      element.style.zIndex = 'auto';
      element.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
    });
    
    // Add completion indicator
    if (isCompleted) {
      const completionBadge = document.createElement('div');
      completionBadge.style.cssText = `
        position: absolute;
        top: -5px;
        right: -5px;
        width: 20px;
        height: 20px;
        background-color: #10B981;
        border: 2px solid white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
      `;
      completionBadge.innerHTML = '✓';
      element.appendChild(completionBadge);
    }
    
    return element;
  }, [getPersonaStyle, completedQuests]);

  /**
   * Handle quest marker click
   */
  const handleQuestClick = useCallback((quest: Quest) => {
    setSelectedQuest(quest);
    setShowQuestModal(true);
  }, []);

  /**
   * Update quest markers on map
   */
  const updateQuestMarkers = useCallback(async () => {
    if (!map || !user) return;

    // Remove existing markers
    questMarkers.forEach(({ marker }) => marker.remove());
    
    // Check completion status for each quest
    const completionChecks = await Promise.all(
      mapQuests.map(async (quest) => {
        try {
          const submission = await getUserSubmission(quest.id);
          return {
            questId: quest.id,
            isCompleted: submission?.status === 'accepted' || submission?.status === 'autograded'
          };
        } catch {
          return { questId: quest.id, isCompleted: false };
        }
      })
    );
    
    // Update completed quests set
    const newCompletedQuests = new Set(
      completionChecks
        .filter(check => check.isCompleted)
        .map(check => check.questId)
    );
    setCompletedQuests(newCompletedQuests);

    // Create new markers
    const newMarkers: QuestMarker[] = mapQuests.map(quest => {
      const element = createQuestMarkerElement(quest);
      
      // Add click handler
      element.addEventListener('click', () => handleQuestClick(quest));
      
      // Create Mapbox marker
      const marker = new mapboxgl.Marker(element)
        .setLngLat([quest.lng, quest.lat])
        .addTo(map);
      
      return { quest, marker, element };
    });
    
    setQuestMarkers(newMarkers);
  }, [map, user, mapQuests, questMarkers, createQuestMarkerElement, handleQuestClick, getUserSubmission]);

  /**
   * Initialize quest markers when map and quests are ready
   */
  useEffect(() => {
    if (map && mapQuests.length > 0) {
      updateQuestMarkers();
    }
  }, [map, mapQuests, updateQuestMarkers]);

  /**
   * Refresh quests on mount
   */
  useEffect(() => {
    refreshMapQuests();
  }, [refreshMapQuests]);

  /**
   * Handle quest completion
   */
  const handleQuestComplete = useCallback((questId: string, submission: QuestSubmission) => {
    // Update completion status
    if (submission.status === 'accepted' || submission.status === 'autograded') {
      setCompletedQuests(prev => new Set([...prev, questId]));
      
      // Update the specific marker to show completion
      const questMarker = questMarkers.find(qm => qm.quest.id === questId);
      if (questMarker) {
        questMarker.element.style.opacity = '0.6';
        questMarker.element.style.filter = 'grayscale(50%)';
        
        // Add completion badge if not already present
        if (!questMarker.element.querySelector('.completion-badge')) {
          const badge = document.createElement('div');
          badge.className = 'completion-badge';
          badge.style.cssText = `
            position: absolute;
            top: -5px;
            right: -5px;
            width: 20px;
            height: 20px;
            background-color: #10B981;
            border: 2px solid white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
          `;
          badge.innerHTML = '✓';
          questMarker.element.appendChild(badge);
        }
      }
    }
    
    // Close modal
    setShowQuestModal(false);
    setSelectedQuest(null);
  }, [questMarkers]);

  /**
   * Cleanup markers on unmount
   */
  useEffect(() => {
    return () => {
      questMarkers.forEach(({ marker }) => marker.remove());
    };
  }, [questMarkers]);

  return (
    <div className={className}>
      {/* Quest Statistics Overlay */}
      <motion.div
        className="absolute top-4 right-4 z-10 bg-glass-dark border-glass-dark rounded-xl p-4 min-w-[200px]"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.5 }}
      >
        <h4 className="font-semibold text-white mb-3">Quest Progress</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-300">Available:</span>
            <span className="text-white">{mapQuests.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-300">Completed:</span>
            <span className="text-cyber-green-400">{completedQuests.size}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-300">Progress:</span>
            <span className="text-white">
              {mapQuests.length > 0 ? Math.round((completedQuests.size / mapQuests.length) * 100) : 0}%
            </span>
          </div>
        </div>
      </motion.div>

      {/* Quest Play Modal */}
      <QuestPlayModal
        quest={selectedQuest}
        isOpen={showQuestModal}
        onClose={() => {
          setShowQuestModal(false);
          setSelectedQuest(null);
        }}
        onQuestComplete={handleQuestComplete}
      />
    </div>
  );
};

export default QuestMapOverlay;