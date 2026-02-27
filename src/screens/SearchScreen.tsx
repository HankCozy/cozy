import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../config/api';

interface Member {
  id: string;
  firstName: string | null;
  lastName: string | null;
  profileSummary: string | null;
}

function extractHeadline(summary: string | null): string {
  if (!summary) return '';
  const sentences = summary.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 10);
  return sentences[0]?.trim() || '';
}

export default function SearchScreen() {
  const navigation = useNavigation<any>();
  const { auth } = useAuth();
  const { token } = auth;
  const [query, setQuery] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    React.useCallback(() => {
      const fetchMembers = async () => {
        try {
          const response = await fetch(`${API_BASE_URL}/api/communities/members`, {
            headers: { 'Authorization': `Bearer ${token}` },
          });
          if (response.ok) {
            const data = await response.json();
            if (data.success) setMembers(data.members);
          }
        } catch (error) {
          console.error('Failed to fetch members:', error);
        } finally {
          setLoading(false);
        }
      };
      fetchMembers();
    }, [token])
  );

  const filtered = query.trim()
    ? members.filter((m) => {
        const full = `${m.firstName ?? ''} ${m.lastName ?? ''}`.toLowerCase();
        return full.includes(query.toLowerCase());
      })
    : members;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Search</Text>
      </View>

      <View style={styles.searchRow}>
        <Feather name="search" size={16} color="#9ca3af" style={styles.searchIcon} />
        <TextInput
          style={styles.input}
          placeholder="Search members..."
          placeholderTextColor="#9ca3af"
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} color="#3b82f6" />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.list}
          keyboardDismissMode="on-drag"
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {query.trim() ? 'No members match that name.' : 'No members yet.'}
            </Text>
          }
          renderItem={({ item, index }) => (
            <TouchableOpacity
              style={[styles.row, index < filtered.length - 1 && styles.rowBorder]}
              onPress={() => navigation.navigate('MemberProfile', { userId: item.id })}
              activeOpacity={0.7}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(item.firstName?.[0] ?? '?').toUpperCase()}
                </Text>
              </View>
              <View style={styles.info}>
                <Text style={styles.name}>
                  {item.firstName} {item.lastName}
                </Text>
                {extractHeadline(item.profileSummary) ? (
                  <Text style={styles.headline} numberOfLines={1}>
                    {extractHeadline(item.profileSummary)}
                  </Text>
                ) : null}
              </View>
              <Feather name="chevron-right" size={16} color="#D1D5DB" />
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
  },
  loader: {
    marginTop: 48,
  },
  list: {
    marginHorizontal: 20,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#3b82f6',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  headline: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  emptyText: {
    textAlign: 'center',
    padding: 32,
    fontSize: 14,
    color: '#9ca3af',
  },
});
