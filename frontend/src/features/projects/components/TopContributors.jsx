import React from 'react';
import PropTypes from 'prop-types';
import { Trophy } from 'lucide-react';
import { getMediaUrl } from '../../../shared/utils/media';
import { handleAvatarError } from '../../../utils/imageUtils';

const RANK_STYLES = [
  'bg-yellow-500 text-black',
  'bg-gray-300 text-black',
  'bg-amber-700 text-white',
];

/** En çok katkı verenler: kenar çubuğu yerine alt bölümde kompakt yatay şerit. */
const TopContributors = ({ users }) => {
  if (!users || users.length === 0) return null;

  return (
    <section aria-labelledby="katkicilar-baslik" className="rounded-3xl border border-white/10 bg-[#1a2333] p-5">
      <div className="mb-4 flex items-center gap-2">
        <Trophy className="text-yellow-400" size={20} aria-hidden="true" />
        <h2 id="katkicilar-baslik" className="text-lg font-bold">Top Contributors</h2>
      </div>
      <ol className="flex gap-3 overflow-x-auto pb-1">
        {users.slice(0, 5).map((user, index) => {
          const name = user.full_name || user.name;
          return (
            <li key={user.id} className="flex min-w-[210px] flex-1 items-center gap-3 rounded-2xl bg-white/5 p-3">
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${RANK_STYLES[index] || 'bg-gray-700 text-gray-300'}`}>
                {index + 1}
              </span>
              <img
                src={user.avatar_url || user.avatar || getMediaUrl(user.profile_image, name)}
                alt=""
                loading="lazy"
                decoding="async"
                className="h-10 w-10 shrink-0 rounded-full border border-white/10 object-cover"
                onError={(event) => handleAvatarError(event, name)}
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{name}</p>
                <p className="text-xs text-gray-500">{user.project_count || user.projectCount || 0} Proje</p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
};

TopContributors.propTypes = {
  users: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    full_name: PropTypes.string,
    name: PropTypes.string,
  })),
};

export default TopContributors;
