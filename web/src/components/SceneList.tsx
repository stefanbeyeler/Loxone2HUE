import { Scene, Group } from '../types';
import { Play, Palette, Home } from 'lucide-react';

interface SceneListProps {
  scenes: Scene[];
  groups: Group[];
  onActivateScene: (id: string) => void;
}

export function SceneList({ scenes, groups, onActivateScene }: SceneListProps) {
  const getGroupName = (groupId: string) => {
    const group = groups.find((g) => g.id === groupId);
    return group?.name || 'Unbekannt';
  };

  // Group scenes by their parent group/room
  const scenesByGroup = scenes.reduce((acc, scene) => {
    const groupId = scene.group_id || 'other';
    if (!acc[groupId]) {
      acc[groupId] = [];
    }
    acc[groupId].push(scene);
    return acc;
  }, {} as Record<string, Scene[]>);

  const groupIds = Object.keys(scenesByGroup);

  return (
    <div className="space-y-6">
      {groupIds.map((groupId) => {
        const groupScenes = scenesByGroup[groupId];
        const groupName = groupId === 'other' ? 'Andere' : getGroupName(groupId);

        return (
          <div key={groupId} className="space-y-3">
            <div className="flex items-center gap-2 text-gray-400">
              <Home size={16} />
              <h3 className="text-sm font-medium">{groupName}</h3>
              <span className="text-xs bg-gray-700 px-2 py-0.5 rounded-full">
                {groupScenes.length}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {groupScenes.map((scene) => (
                <button
                  key={scene.id}
                  onClick={() => onActivateScene(scene.id)}
                  className="
                    flex items-center gap-3 p-4 bg-gray-800 rounded-xl
                    hover:bg-gray-700 transition-all hover:ring-2 hover:ring-hue-orange
                    text-left group
                  "
                >
                  <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center group-hover:bg-hue-orange transition-colors">
                    <Palette
                      size={20}
                      className="text-hue-orange group-hover:text-gray-900 transition-colors"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-white truncate">{scene.name}</h4>
                    <p className="text-xs text-gray-400">Szene aktivieren</p>
                  </div>
                  <Play
                    size={18}
                    className="text-gray-500 group-hover:text-hue-orange transition-colors"
                  />
                </button>
              ))}
            </div>
          </div>
        );
      })}

      {scenes.length === 0 && (
        <div className="text-center py-12">
          <Palette className="mx-auto text-gray-600 mb-4" size={48} />
          <p className="text-gray-400">Keine Szenen gefunden</p>
          <p className="text-xs text-gray-500 mt-2">
            Szenen werden in der Philips HUE App erstellt
          </p>
        </div>
      )}
    </div>
  );
}
