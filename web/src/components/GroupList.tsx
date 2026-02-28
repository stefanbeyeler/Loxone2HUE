import { useState } from 'react';
import { Group, Scene, Mapping } from '../types';
import { Home, Layers, Power, Play, Link2 } from 'lucide-react';

interface GroupListProps {
  groups: Group[];
  scenes: Scene[];
  mappings: Mapping[];
  onToggle: (id: string, on: boolean) => void;
  onActivateScene: (id: string) => void;
  title?: string;
}

export function GroupList({ groups, scenes, mappings, onToggle, onActivateScene, title }: GroupListProps) {
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  const getGroupScenes = (groupId: string) => {
    return scenes
      .filter((scene) => scene.group_id === groupId)
      .sort((a, b) => a.name.localeCompare(b.name, 'de'));
  };

  const sortedGroups = [...groups].sort((a, b) =>
    a.name.localeCompare(b.name, 'de')
  );

  return (
    <div className="space-y-4">
      {sortedGroups.map((group) => {
        const groupScenes = getGroupScenes(group.id);
        const isExpanded = expandedGroup === group.id;

        return (
          <div
            key={group.id}
            className={`
              bg-gray-800 rounded-xl overflow-hidden transition-all
              ${group.state.any_on ? 'ring-2 ring-hue-orange' : ''}
            `}
          >
            <div
              className="p-4 flex items-center justify-between cursor-pointer"
              onClick={() => setExpandedGroup(isExpanded ? null : group.id)}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center
                    ${group.state.any_on ? 'bg-hue-orange' : 'bg-gray-700'}
                  `}
                >
                  {group.type === 'room' ? (
                    <Home size={20} className={group.state.any_on ? 'text-gray-900' : 'text-gray-400'} />
                  ) : (
                    <Layers size={20} className={group.state.any_on ? 'text-gray-900' : 'text-gray-400'} />
                  )}
                </div>
                <div>
                  <h3 className="font-medium text-white">{group.name}</h3>
                  <p className="text-xs text-gray-400">
                    {group.lights.length} Geräte • {groupScenes.length} Szenen
                  </p>
                  <p className="text-xs text-gray-500 font-mono">{group.id}</p>
                  {(() => {
                    const groupMapping = mappings.find(m => m.hue_id === group.id && m.hue_type === 'group');
                    return groupMapping ? (
                      <div className="flex items-center gap-1 mt-0.5">
                        <Link2 size={12} className="text-hue-orange" />
                        <span className="text-xs text-gray-400">{groupMapping.loxone_id}</span>
                      </div>
                    ) : null;
                  })()}
                </div>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggle(group.id, !group.state.any_on);
                }}
                className={`
                  p-2 rounded-lg transition-colors
                  ${group.state.any_on
                    ? 'bg-hue-orange text-gray-900'
                    : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                  }
                `}
              >
                <Power size={20} />
              </button>
            </div>

            {isExpanded && groupScenes.length > 0 && (
              <div className="border-t border-gray-700 p-4">
                <h4 className="text-sm text-gray-400 mb-3">Szenen</h4>
                <div className="grid grid-cols-2 gap-2">
                  {groupScenes.map((scene) => (
                    <button
                      key={scene.id}
                      onClick={() => onActivateScene(scene.id)}
                      className="
                        flex items-center gap-2 p-3 bg-gray-700 rounded-lg
                        hover:bg-gray-600 transition-colors text-left
                      "
                    >
                      <Play size={16} className="text-hue-orange flex-shrink-0" />
                      <div className="min-w-0">
                        <span className="text-sm text-white truncate block">{scene.name}</span>
                        <span className="text-xs text-gray-500 font-mono truncate block">{scene.id}</span>
                        {(() => {
                          const sceneMapping = mappings.find(m => m.hue_id === scene.id && m.hue_type === 'scene');
                          return sceneMapping ? (
                            <span className="flex items-center gap-1 mt-0.5">
                              <Link2 size={10} className="text-hue-orange" />
                              <span className="text-xs text-gray-400">{sceneMapping.loxone_id}</span>
                            </span>
                          ) : null;
                        })()}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {groups.length === 0 && (
        <div className="text-center py-12">
          {title === 'Zonen' ? (
            <Layers className="mx-auto text-gray-600 mb-4" size={48} />
          ) : (
            <Home className="mx-auto text-gray-600 mb-4" size={48} />
          )}
          <p className="text-gray-400">Keine {title || 'Gruppen'} gefunden</p>
        </div>
      )}
    </div>
  );
}
