import React from 'react';
import Sidebar from '../components/Sidebar';

/**
 * Loglar Sayfası
 * Sistem loglarını ve kullanıcı aktivitelerini gösterir
 */
const Logs = () => {
  // Örnek log verileri (gerçek uygulamada API'den gelecek)
  const sampleLogs = [
    { id: 1, user: 'admin', action: 'Etkinlik eklendi', target: 'MACS Log Etkinliği', timestamp: '2023-11-10 14:30:25' },
    { id: 2, user: 'admin', action: 'Proje güncellendi', target: 'AI Projesi', timestamp: '2023-11-09 10:15:42' },
    { id: 3, user: 'editor', action: 'Kullanıcı eklendi', target: 'yeni.kullanici@example.com', timestamp: '2023-11-08 16:22:10' },
    { id: 4, user: 'admin', action: 'Etkinlik silindi', target: 'Eski Workshop', timestamp: '2023-11-07 09:45:33' },
    { id: 5, user: 'editor', action: 'Proje eklendi', target: 'Web Geliştirme Projesi', timestamp: '2023-11-06 11:12:55' },
  ];

  return (
    <div className="admin-container">
      <Sidebar />
      
      <main className="admin-main">
        <div className="admin-card">
          <div className="admin-card-header">
            <h2 className="admin-card-title">Sistem Logları</h2>
          </div>
          
          <div className="admin-card-body">
            <div className="logs-container">
              <div className="logs-table">
                <div className="logs-table-header">
                  <div className="logs-table-row header">
                    <div className="logs-table-cell">ID</div>
                    <div className="logs-table-cell">Kullanıcı</div>
                    <div className="logs-table-cell">İşlem</div>
                    <div className="logs-table-cell">Hedef</div>
                    <div className="logs-table-cell">Tarih</div>
                  </div>
                </div>
                
                <div className="logs-table-body">
                  {sampleLogs.map((log) => (
                    <div key={log.id} className="logs-table-row">
                      <div className="logs-table-cell">{log.id}</div>
                      <div className="logs-table-cell">{log.user}</div>
                      <div className="logs-table-cell">{log.action}</div>
                      <div className="logs-table-cell">{log.target}</div>
                      <div className="logs-table-cell">{log.timestamp}</div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="logs-info" style={{ marginTop: '20px', padding: '10px', backgroundColor: '#f9f9f9', borderRadius: '4px' }}>
                <p>
                  <strong>Not:</strong> Bu sayfa şu anda örnek verilerle gösterilmektedir. 
                  Gerçek uygulamada, sistem logları ve kullanıcı aktiviteleri API üzerinden alınacaktır.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Logs;
