import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

export default function PrivacyPolicyScreen() {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Feather name="arrow-left" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        {/* Effective Date */}
        <Text style={styles.effectiveDate}>Effective Date: January 6, 2026</Text>

        {/* Introduction */}
        <Text style={styles.paragraph}>
          This Privacy Policy describes how Cozy Circle ("we," "us," or "our") collects, uses,
          protects, and discloses information gathered from users ("you") of the Cozy Circle mobile
          application (the "App"). We are committed to maintaining your trust and ensuring the privacy of
          your data, especially sensitive data like voice recordings.
        </Text>

        {/* Section 1 */}
        <Text style={styles.sectionTitle}>1. Data We Collect and How We Use It</Text>
        <Text style={styles.paragraph}>
          We collect data primarily to provide the core functionality of the Cozy Circle community network:
          connecting members through quick, authentic profiles.
        </Text>

        <Text style={styles.dataTypeTitle}>Voice Recordings</Text>
        <Text style={styles.paragraph}>
          • <Text style={styles.bold}>Collection Method:</Text> Directly provided by you via device microphone.
        </Text>
        <Text style={styles.paragraph}>
          • <Text style={styles.bold}>Purpose of Use:</Text> Core Functionality - Used solely to generate your community profile.
        </Text>
        <Text style={styles.paragraph}>
          • <Text style={styles.bold}>Sharing:</Text> Shared only with our Third-Party Transcription Provider (AssemblyAI).
        </Text>
        <Text style={styles.paragraph}>
          • <Text style={styles.bold}>Retention:</Text> Cozy Circle does not store your recordings. AssemblyAI uploads audio for transcription service.
        </Text>

        <Text style={styles.dataTypeTitle}>Transcribed Text & Summaries</Text>
        <Text style={styles.paragraph}>
          • <Text style={styles.bold}>Collection Method:</Text> Created by our third-party services (AssemblyAI and Anthropic) from your voice recording.
        </Text>
        <Text style={styles.paragraph}>
          • <Text style={styles.bold}>Purpose of Use:</Text> Core Functionality - To form the final, short profile visible to your closed community.
        </Text>
        <Text style={styles.paragraph}>
          • <Text style={styles.bold}>Sharing:</Text> Shared with your authorized members within your closed community network.
        </Text>
        <Text style={styles.paragraph}>
          • <Text style={styles.bold}>Retention:</Text> Retained for the life of your account, or until you delete the profile.
        </Text>

        <Text style={styles.dataTypeTitle}>Profile & Account Data</Text>
        <Text style={styles.paragraph}>
          • <Text style={styles.bold}>Collection Method:</Text> Name (or username), email address (for account validation), and community affiliation.
        </Text>
        <Text style={styles.paragraph}>
          • <Text style={styles.bold}>Purpose of Use:</Text> Account Management - To manage your account, authenticate you, and ensure security within your closed community.
        </Text>
        <Text style={styles.paragraph}>
          • <Text style={styles.bold}>Sharing:</Text> Shared with your authorized members within your closed community network.
        </Text>
        <Text style={styles.paragraph}>
          • <Text style={styles.bold}>Retention:</Text> Retained for the life of your account.
        </Text>

        <Text style={styles.dataTypeTitle}>Non-Personal Data</Text>
        <Text style={styles.paragraph}>
          • <Text style={styles.bold}>Collection Method:</Text> Device type, operating system version, and anonymized usage statistics.
        </Text>
        <Text style={styles.paragraph}>
          • <Text style={styles.bold}>Purpose of Use:</Text> App Improvement - To analyze performance, fix bugs, and improve the app's stability and speed.
        </Text>
        <Text style={styles.paragraph}>
          • <Text style={styles.bold}>Sharing:</Text> Not shared with third parties. Used internally only.
        </Text>
        <Text style={styles.paragraph}>
          • <Text style={styles.bold}>Retention:</Text> Retained for as long as necessary for business operations.
        </Text>

        <Text style={styles.assurance}>
          <Text style={styles.bold}>Crucial Assurance:</Text> We do not sell your Personal Data, and we do not use your data for
          advertising, marketing, or public sharing outside of your closed Cozy Circle community.
        </Text>

        {/* Section 2 */}
        <Text style={styles.sectionTitle}>2. Security and Data Protection</Text>
        <Text style={styles.paragraph}>
          We use industry-standard security measures, including encryption in transit (TLS/SSL) and at
          rest, to protect your data from unauthorized access, disclosure, alteration, or destruction.
          However, no method of transmission over the Internet is 100% secure.
        </Text>

        {/* Section 3 */}
        <Text style={styles.sectionTitle}>3. Third-Party Data Processors</Text>
        <Text style={styles.paragraph}>
          We rely on external services solely to perform the core functions of the App. These parties act
          as our Service Providers and are contractually obligated to protect your data and only use it for
          the specific tasks we define.
        </Text>
        <Text style={styles.paragraph}>
          • <Text style={styles.bold}>Transcription:</Text> We use AssemblyAI to process your voice recordings into text.
        </Text>
        <Text style={styles.paragraph}>
          • <Text style={styles.bold}>Summarization:</Text> We use Anthropic to generate the final summarized profile from the transcribed text.
        </Text>
        <Text style={styles.paragraph}>
          • <Text style={styles.bold}>Infrastructure:</Text> We use Supabase for database management and Railway for backend hosting.
        </Text>
        <Text style={styles.paragraph}>
          All third-party Service Providers are strictly prohibited from using your data for their own
          purposes, including training their own models or marketing.
        </Text>

        {/* Section 4 */}
        <Text style={styles.sectionTitle}>4. Your Rights and Data Deletion</Text>
        <Text style={styles.paragraph}>
          You have full control over your data within Cozy Circle.
        </Text>
        <Text style={styles.paragraph}>
          • <Text style={styles.bold}>Access and Correction:</Text> You may review and update your profile information at any
          time through the App's settings.
        </Text>
        <Text style={styles.paragraph}>
          • <Text style={styles.bold}>Data and Account Deletion:</Text> We fully comply with Apple's App Store Review Guideline
          5.1.1(v) and Google's Data Safety requirements by providing a simple, direct method for
          account deletion.
        </Text>
        <Text style={styles.paragraph}>
          &nbsp;&nbsp;○ <Text style={styles.bold}>How to Initiate Deletion:</Text> You can request account deletion directly within the
          App's Settings menu.
        </Text>
        <Text style={styles.paragraph}>
          &nbsp;&nbsp;○ <Text style={styles.bold}>Scope of Deletion:</Text> When you delete your account, we will permanently erase
          your profile, all associated Transcribed Text, Summaries, and any remaining
          Voice Recordings from our servers.
        </Text>
        <Text style={styles.paragraph}>
          &nbsp;&nbsp;○ <Text style={styles.bold}>Deletion Timeline:</Text> We will confirm and complete the permanent deletion of your
          data within 30 days, unless legally required to retain specific, limited information
          (e.g., transaction records).
        </Text>

        {/* Section 5 */}
        <Text style={styles.sectionTitle}>5. Children's Privacy</Text>
        <Text style={styles.paragraph}>
          The Cozy Circle App is not directed to individuals under the age of 13. We do not knowingly
          collect personal information from children under 13. If you become aware that a child has
          provided us with Personal Data, please contact us immediately, and we will take steps to delete
          such information and terminate the child's account.
        </Text>

        {/* Section 6 */}
        <Text style={styles.sectionTitle}>6. Contact Us</Text>
        <Text style={styles.paragraph}>
          If you have any questions or concerns about this Privacy Policy, your data, or the Cozy Circle
          App, please contact us at:
        </Text>
        <Text style={styles.contactEmail}>matt@cozyhomecommunity.com</Text>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Version 1.0 • January 6, 2026</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    paddingBottom: 48,
  },
  effectiveDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginTop: 32,
    marginBottom: 12,
  },
  dataTypeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 20,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 24,
    color: '#374151',
    marginBottom: 12,
  },
  bold: {
    fontWeight: '600',
    color: '#111827',
  },
  assurance: {
    fontSize: 15,
    lineHeight: 24,
    color: '#374151',
    marginTop: 16,
    marginBottom: 12,
    padding: 16,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  contactEmail: {
    fontSize: 15,
    fontWeight: '600',
    color: '#3b82f6',
    marginTop: 8,
    marginBottom: 12,
  },
  footer: {
    marginTop: 40,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: '#9ca3af',
  },
});
