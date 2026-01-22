import React, { useState, useEffect, useRef } from 'react';
import { memberService } from '../../../shared/services/api';
import env from '../../../shared/config/env';

/**
 * Üye Seçici Bileşeni
 * Proje formunda üyeleri aramak ve seçmek için kullanılır.
 */
const MemberSelector = ({ selectedMembers = [], onChange }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Backend URL'den /api kısmını çıkar ve image URL ile birleştir
  const getImageUrl = (imageUrl) => {
    if (!imageUrl) return null;
    if (imageUrl.startsWith('http')) return imageUrl;
    const baseUrl = (env.apiUrl || 'http://localhost:8000').replace(/\/api$/, '');
    return `${baseUrl}${imageUrl}`;
  };

  // Üyeleri ara
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchTerm.length >= 2) {
        setLoading(true);
        try {
          const results = await memberService.getAll({ 
            search: searchTerm, 
            limit: 10,
            is_active: true 
          });
          // Halihazırda seçili olmayanları filtrele
          const filtered = results.filter(
            res => !selectedMembers.some(sm => sm.member_id === res.id)
          );
          setSearchResults(filtered);
          setShowDropdown(true);
        } catch (err) {
          console.error("Üye arama hatası:", err);
        } finally {
          setLoading(false);
        }
      } else {
        setSearchResults([]);
        setShowDropdown(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, selectedMembers]);

  // Dışarı tıklayınca dropdown'ı kapat
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectMember = (member) => {
    const newMember = {
      member_id: member.id,
      full_name: member.full_name,
      profile_image: member.profile_image,
      role: '' // Varsayılan boş rol
    };
    onChange([...selectedMembers, newMember]);
    setSearchTerm('');
    setShowDropdown(false);
  };

  const handleRemoveMember = (memberId) => {
    onChange(selectedMembers.filter(m => m.member_id !== memberId));
  };

  const handleRoleChange = (memberId, role) => {
    const updated = selectedMembers.map(m => 
      m.member_id === memberId ? { ...m, role } : m
    );
    onChange(updated);
  };

  return (
    <div className="member-selector" ref={dropdownRef}>
      <label className="form-label">Takım Üyeleri</label>
      
      {/* Arama Inputu */}
      <div className="search-container" style={{ position: 'relative' }}>
        <input
          type="text"
          className="form-input"
          placeholder="Üye adı ile ara... (en az 2 karakter)"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => searchTerm.length >= 2 && setShowDropdown(true)}
        />
        
        {loading && <div className="spinner-small" style={{ position: 'absolute', right: '10px', top: '10px' }}></div>}

        {/* Dropdown Sonuçları */}
        {showDropdown && searchResults.length > 0 && (
          <div className="search-dropdown" style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            backgroundColor: '#fff',
            border: '1px solid #ddd',
            borderRadius: '4px',
            zIndex: 1000,
            maxHeight: '200px',
            overflowY: 'auto',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}>
            {searchResults.map(member => (
              <div 
                key={member.id} 
                className="dropdown-item"
                onClick={() => handleSelectMember(member)}
                style={{
                  padding: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  borderBottom: '1px solid #f0f0f0'
                }}
              >
                <div style={{
                  width: '30px', 
                  height: '30px', 
                  borderRadius: '50%', 
                  backgroundColor: '#e0e0e0',
                  marginRight: '10px',
                  overflow: 'hidden'
                }}>
                  {member.profile_image ? (
                    <img src={getImageUrl(member.profile_image)} alt="" style={{width: '100%', height: '100%', objectFit: 'cover'}} />
                  ) : (
                    <div style={{display:'flex', alignItems:'center', justifyContent:'center', height:'100%', fontSize:'12px'}}>
                      {member.full_name.charAt(0)}
                    </div>
                  )}
                </div>
                <span>{member.full_name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Seçili Üyeler Listesi */}
      <div className="selected-members-tags" style={{ marginTop: '15px' }}>
        {selectedMembers.map(member => (
          <div key={member.member_id} className="member-tag-card" style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '8px 12px',
            marginBottom: '10px',
            gap: '12px'
          }}>
             <div style={{
                width: '32px', 
                height: '32px', 
                borderRadius: '50%', 
                backgroundColor: '#e0e0e0',
                overflow: 'hidden',
                flexShrink: 0
              }}>
                {member.profile_image ? (
                  <img src={getImageUrl(member.profile_image)} alt="" style={{width: '100%', height: '100%', objectFit: 'cover'}} />
                ) : (
                  <div style={{display:'flex', alignItems:'center', justifyContent:'center', height:'100%', fontSize:'14px'}}>
                    {member.full_name?.charAt(0)}
                  </div>
                )}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '500', fontSize: '14px' }}>{member.full_name}</div>
                <input 
                  type="text" 
                  className="role-input"
                  placeholder="Rol (örn: Lead Developer)"
                  value={member.role}
                  onChange={(e) => handleRoleChange(member.member_id, e.target.value)}
                  style={{
                    border: 'none',
                    borderBottom: '1px solid transparent',
                    backgroundColor: 'transparent',
                    fontSize: '12px',
                    width: '100%',
                    outline: 'none',
                    color: '#64748b',
                    padding: '2px 0'
                  }}
                  onFocus={(e) => e.target.style.borderBottom = '1px solid #cbd5e1'}
                  onBlur={(e) => e.target.style.borderBottom = '1px solid transparent'}
                />
              </div>

              <button 
                type="button" 
                onClick={() => handleRemoveMember(member.member_id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ef4444',
                  cursor: 'pointer',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  padding: '4px'
                }}
              >
                &times;
              </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MemberSelector;
