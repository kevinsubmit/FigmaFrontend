import SwiftUI
import UIKit

private enum StoreDetailTab: String, CaseIterable, Identifiable {
    case services = "SERVICES"
    case reviews = "REVIEWS"
    case portfolio = "PORTFOLIO"
    case details = "DETAILS"

    var id: String { rawValue }
}

struct StoreDetailView: View {
    @Environment(\.dismiss) private var dismiss
    let storeID: Int
    @StateObject private var viewModel = StoreDetailViewModel()
    @State private var alertMessage: String = ""
    @State private var showAlert: Bool = false
    @State private var selectedTab: StoreDetailTab = .services
    @State private var heroPageIndex: Int = 0
    @State private var selectedServiceIDs: [Int] = []
    @State private var reviewGalleryImages: [URL] = []
    @State private var reviewGalleryIndex: Int = 0
    @State private var showReviewGallery: Bool = false
    @State private var showFullHours: Bool = false
    @State private var previousSystemTabBarHidden: Bool?
    @State private var showBookServicesSheet: Bool = false

    private let brandGold = UITheme.brandGold
    private let cardBG = UITheme.cardBackground

    private let portfolioColumns = [
        GridItem(.flexible(), spacing: UITheme.spacing8),
        GridItem(.flexible(), spacing: UITheme.spacing8),
    ]

    var body: some View {
        VStack(spacing: 0) {
            topBar

            ScrollView {
                if let store = viewModel.store {
                    VStack(spacing: 0) {
                        heroCarousel(store)

                        VStack(alignment: .leading, spacing: UITheme.spacing14) {
                            storeIdentitySection(store)
                            tabBar
                            tabContent(store)
                        }
                        .padding(.horizontal, UITheme.pagePadding)
                        .padding(.top, UITheme.spacing12)
                        .padding(.bottom, UITheme.spacing24)
                    }
                }
            }
        }
        .toolbar(.hidden, for: .navigationBar)
        .toolbar(.hidden, for: .tabBar)
        .background(UITheme.pageBackground)
        .tint(brandGold)
        .safeAreaInset(edge: .bottom, spacing: 0) {
            if selectedTab == .services,
               let store = viewModel.store,
               !selectedServices.isEmpty {
                selectedServicesBar(store: store, services: selectedServices)
            }
        }
        .task {
            await viewModel.loadStore(storeID: storeID)
        }
        .onAppear {
            captureAndHideSystemTabBar()
        }
        .onDisappear {
            restoreSystemTabBarVisibility()
        }
        .onChange(of: viewModel.errorMessage) { value in
            guard let value, !value.isEmpty else { return }
            alertMessage = value
            showAlert = true
        }
        .alert("Message", isPresented: $showAlert) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(alertMessage)
        }
        .overlay {
            if viewModel.isLoading {
                ProgressView("Loading store...")
                    .padding(UITheme.spacing20)
                    .background(cardBG)
                    .clipShape(RoundedRectangle(cornerRadius: UITheme.overlayCornerRadius))
            }
        }
        .fullScreenCover(isPresented: $showReviewGallery) {
            reviewImageViewer
        }
        .sheet(isPresented: $showBookServicesSheet) {
            if let store = viewModel.store,
               let firstSelectedServiceID = selectedServices.first?.id {
                BookAppointmentView(
                    storeID: store.id,
                    preselectedServiceID: firstSelectedServiceID,
                    preselectedServiceIDs: selectedServices.map(\.id),
                    presentationStyle: .bottomSheet
                )
                .presentationDetents([.large])
                .presentationDragIndicator(.hidden)
                .h5BottomSheetStyle()
            }
        }
    }

    private var topBar: some View {
        ZStack {
            VStack(alignment: .center, spacing: UITheme.spacing1) {
                Text("STEP 02")
                    .font(.caption2.weight(.bold))
                    .kerning(2.2)
                    .foregroundStyle(brandGold)
                Text("Book Services")
                    .font(.headline.weight(.bold))
                    .foregroundStyle(.white)
            }
            .frame(maxWidth: .infinity, alignment: .center)

            HStack {
                Button {
                    dismiss()
                } label: {
                    Image(systemName: "chevron.left")
                        .font(.system(size: UITheme.navIconSize, weight: .semibold))
                        .foregroundStyle(.white)
                        .frame(width: UITheme.navControlSize, height: UITheme.navControlSize)
                        .background(Color.white.opacity(0.07))
                        .clipShape(Circle())
                }
                .buttonStyle(.plain)

                Spacer()
            }
        }
        .padding(.horizontal, UITheme.pagePadding)
        .padding(.top, UITheme.spacing8)
        .padding(.bottom, UITheme.spacing8)
        .frame(maxWidth: .infinity)
        .background(Color.black.opacity(0.96))
        .overlay(alignment: .bottom) {
            Rectangle()
                .fill(Color.white.opacity(0.08))
                .frame(height: UITheme.spacing1)
        }
    }

    @ViewBuilder
    private func heroCarousel(_ store: StoreDetailDTO) -> some View {
        if !store.images.isEmpty {
            ZStack(alignment: .bottomTrailing) {
                TabView(selection: $heroPageIndex) {
                    ForEach(Array(store.images.enumerated()), id: \.element.id) { idx, image in
                        AsyncImage(url: imageURL(from: image.image_url)) { phase in
                            switch phase {
                            case .empty:
                                ProgressView()
                                    .frame(maxWidth: .infinity, minHeight: UITheme.cardHeroHeight, maxHeight: UITheme.storeHeroHeight)
                            case .success(let img):
                                img
                                    .resizable()
                                    .scaledToFill()
                                    .frame(maxWidth: .infinity, minHeight: UITheme.cardHeroHeight, maxHeight: UITheme.storeHeroHeight)
                                    .clipped()
                                    .overlay(
                                        LinearGradient(
                                            colors: [.clear, Color.black.opacity(0.55)],
                                            startPoint: .center,
                                            endPoint: .bottom
                                        )
                                    )
                            case .failure:
                                Color.gray.opacity(0.2)
                                    .frame(maxWidth: .infinity, minHeight: UITheme.cardHeroHeight, maxHeight: UITheme.storeHeroHeight)
                                    .overlay(Text("Image unavailable").font(.caption))
                            @unknown default:
                                EmptyView()
                            }
                        }
                        .tag(idx)
                    }
                }
                .frame(height: UITheme.storeHeroHeight)
                .tabViewStyle(.page(indexDisplayMode: .never))

                HStack(spacing: UITheme.spacing6) {
                    ForEach(0..<store.images.count, id: \.self) { idx in
                        Capsule()
                            .fill(idx == heroPageIndex ? brandGold : Color.white.opacity(0.5))
                            .frame(width: idx == heroPageIndex ? 14 : 6, height: 6)
                    }
                }
                .padding(.trailing, UITheme.spacing10)
                .padding(.bottom, UITheme.spacing10)
            }
            .frame(maxWidth: .infinity)
            .clipped()
        }
    }

    private func storeIdentitySection(_ store: StoreDetailDTO) -> some View {
        VStack(alignment: .leading, spacing: UITheme.spacing8) {
            Text(store.name)
                .font(.largeTitle.bold())
                .foregroundStyle(.white)

            Text(store.formattedAddress)
                .font(.subheadline)
                .foregroundStyle(.secondary)

            HStack(spacing: UITheme.spacing8) {
                Image(systemName: "star.fill")
                    .foregroundStyle(brandGold)
                    .font(.caption)
                Text(String(format: "%.1f", store.rating))
                    .font(.subheadline.weight(.bold))
                    .foregroundStyle(.white)
                Text("(\(store.review_count) reviews)")
                    .font(.subheadline)
                    .foregroundStyle(brandGold)
            }
        }
        .padding(.horizontal, UITheme.spacing2)
        .padding(.top, UITheme.spacing2)
    }

    private var tabBar: some View {
        HStack(spacing: 0) {
            ForEach(StoreDetailTab.allCases) { tab in
                Button {
                    selectedTab = tab
                } label: {
                    VStack(spacing: UITheme.spacing8) {
                        Text(tab.rawValue)
                            .font(.system(size: 14, weight: .bold))
                            .kerning(1.5)
                            .foregroundStyle(selectedTab == tab ? .white : Color.white.opacity(0.56))
                            .lineLimit(1)
                            .minimumScaleFactor(0.85)
                        Rectangle()
                            .fill(selectedTab == tab ? brandGold : Color.clear)
                            .frame(width: 74, height: UITheme.spacing2 + 1)
                    }
                    .frame(maxWidth: .infinity, minHeight: 48)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .frame(maxWidth: .infinity)
            }
        }
        .padding(.top, UITheme.spacing4)
        .padding(.bottom, UITheme.spacing6)
        .background(Color.black)
        .contentShape(Rectangle())
        .zIndex(10)
        .overlay(alignment: .bottom) {
            Rectangle()
                .fill(Color.white.opacity(0.14))
                .frame(height: UITheme.spacing1)
        }
    }

    @ViewBuilder
    private func tabContent(_ store: StoreDetailDTO) -> some View {
        switch selectedTab {
        case .services:
            servicesContent
        case .reviews:
            reviewsContent(store)
        case .portfolio:
            portfolioContent(store)
        case .details:
            detailsContent(store)
        }
    }

    private var servicesContent: some View {
        VStack(alignment: .leading, spacing: UITheme.spacing12) {
            if viewModel.services.isEmpty {
                Text("No services available right now.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .padding(.vertical, UITheme.spacing24)
            } else {
                ForEach(Array(viewModel.services.enumerated()), id: \.element.id) { idx, service in
                    let isSelected = selectedServiceIDs.contains(service.id)

                    HStack(alignment: .center, spacing: UITheme.spacing10) {
                        VStack(alignment: .leading, spacing: UITheme.spacing4) {
                            Text(service.name)
                                .font(.subheadline.weight(.bold))
                                .foregroundStyle(isSelected ? brandGold : .white)
                            HStack(spacing: UITheme.spacing6 + 1) {
                                Text("$\(String(format: "%.2f", service.price))+")
                                    .font(.caption.weight(.semibold))
                                    .foregroundStyle(.white)
                                Circle()
                                    .fill(Color.white.opacity(0.35))
                                    .frame(width: 3, height: 3)
                                Text("\(service.duration_minutes)m")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }

                        Spacer()

                        Button {
                            toggleServiceSelection(service.id)
                        } label: {
                            HStack(spacing: UITheme.spacing4 + 1) {
                                if isSelected {
                                    Image(systemName: "checkmark")
                                        .font(.caption2.weight(.bold))
                                }
                                Text(isSelected ? "ADDED" : "ADD")
                                    .font(.caption.weight(.bold))
                            }
                            .padding(.horizontal, UITheme.pillHorizontalPadding + 4)
                            .frame(minHeight: UITheme.segmentHeight)
                            .foregroundStyle(isSelected ? .black : brandGold)
                            .background(isSelected ? brandGold : Color.clear)
                            .overlay(
                                RoundedRectangle(cornerRadius: UITheme.chipCornerRadius)
                                    .stroke(brandGold, lineWidth: isSelected ? 0 : 1)
                            )
                            .clipShape(RoundedRectangle(cornerRadius: UITheme.chipCornerRadius))
                        }
                        .buttonStyle(.plain)
                    }
                    .padding(.horizontal, UITheme.pillHorizontalPadding)
                    .padding(.vertical, UITheme.pillVerticalPadding * 2)
                    .background(isSelected ? brandGold.opacity(0.08) : Color.clear)
                    .clipShape(RoundedRectangle(cornerRadius: UITheme.chipCornerRadius))
                    .contentShape(RoundedRectangle(cornerRadius: UITheme.chipCornerRadius))
                    .onTapGesture {
                        toggleServiceSelection(service.id)
                    }

                    if idx != viewModel.services.count - 1 {
                        Divider().background(Color.white.opacity(0.08))
                    }
                }
            }
        }
        .padding(.horizontal, UITheme.spacing2)
        .padding(.top, UITheme.spacing6)
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func reviewsContent(_ store: StoreDetailDTO) -> some View {
        VStack(alignment: .leading, spacing: UITheme.spacing10) {
            HStack(spacing: UITheme.spacing8) {
                Image(systemName: "star.fill")
                    .foregroundStyle(brandGold)
                Text(String(format: "%.1f", store.rating))
                    .font(.title3.weight(.bold))
                    .foregroundStyle(.white)
                Text("• \(store.review_count) reviews")
                    .foregroundStyle(.secondary)
            }

            Divider().background(Color.white.opacity(0.08))

            if viewModel.reviews.isEmpty {
                Text("No reviews yet.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            } else {
                VStack(spacing: UITheme.spacing12) {
                    ForEach(viewModel.reviews) { review in
                        reviewRow(review)
                    }
                }
            }
        }
        .padding(UITheme.cardPadding)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(cardBG)
        .clipShape(RoundedRectangle(cornerRadius: UITheme.cardCornerRadius))
        .overlay(
            RoundedRectangle(cornerRadius: UITheme.cardCornerRadius)
                .stroke(brandGold.opacity(UITheme.cardStrokeOpacity), lineWidth: 1)
        )
    }

    private func reviewRow(_ review: StoreReviewDTO) -> some View {
        VStack(alignment: .leading, spacing: UITheme.spacing8) {
            HStack(alignment: .top, spacing: UITheme.spacing10) {
                Group {
                    if let rawAvatar = review.user_avatar,
                       let avatarURL = imageURL(from: rawAvatar) {
                        AsyncImage(url: avatarURL) { phase in
                            switch phase {
                            case .success(let image):
                                image.resizable().scaledToFill()
                            default:
                                Circle().fill(Color.white.opacity(0.08))
                            }
                        }
                    } else {
                        Circle().fill(Color.white.opacity(0.08))
                    }
                }
                .frame(width: UITheme.iconControlSize, height: UITheme.iconControlSize)
                .clipShape(Circle())
                .overlay(Circle().stroke(Color.white.opacity(0.12), lineWidth: 1))

                VStack(alignment: .leading, spacing: UITheme.spacing4) {
                    HStack(spacing: UITheme.spacing8) {
                        Text(review.user_name ?? "User")
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(.white)
                            .lineLimit(1)
                        Text(formatReviewDate(review.created_at))
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }

                    HStack(spacing: UITheme.spacing2) {
                        ForEach(1...5, id: \.self) { idx in
                            Image(systemName: idx <= Int(review.rating.rounded(.down)) ? "star.fill" : "star")
                                .font(.caption2)
                                .foregroundStyle(brandGold)
                        }
                    }
                }
                Spacer(minLength: 0)
            }

            if let comment = review.comment,
               !comment.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                Text(comment)
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                    .fixedSize(horizontal: false, vertical: true)
            }

            if let rawImages = review.images {
                let reviewImageURLs = rawImages.compactMap(imageURL(from:))
                if !reviewImageURLs.isEmpty {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: UITheme.spacing8) {
                            ForEach(Array(reviewImageURLs.enumerated()), id: \.offset) { idx, url in
                                Button {
                                    reviewGalleryImages = reviewImageURLs
                                    reviewGalleryIndex = idx
                                    showReviewGallery = true
                                } label: {
                                    AsyncImage(url: url) { phase in
                                        switch phase {
                                        case .empty:
                                            ProgressView()
                                                .frame(width: UITheme.thumbnailSize, height: UITheme.thumbnailSize)
                                        case .success(let img):
                                            img
                                                .resizable()
                                                .scaledToFill()
                                                .frame(width: UITheme.thumbnailSize, height: UITheme.thumbnailSize)
                                                .clipped()
                                        case .failure:
                                            Color.gray.opacity(0.2)
                                                .frame(width: UITheme.thumbnailSize, height: UITheme.thumbnailSize)
                                        @unknown default:
                                            EmptyView()
                                        }
                                    }
                                }
                                .clipShape(RoundedRectangle(cornerRadius: UITheme.chipCornerRadius))
                                .overlay(
                                    RoundedRectangle(cornerRadius: UITheme.chipCornerRadius)
                                        .stroke(Color.white.opacity(0.08), lineWidth: 1)
                                )
                                .buttonStyle(.plain)
                            }
                        }
                    }
                }
            }

            if let reply = review.reply,
               let content = reply.content,
               !content.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                VStack(alignment: .leading, spacing: UITheme.spacing4) {
                    Text("Reply from \(reply.admin_name ?? "Store")")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.white.opacity(0.9))
                    Text(content)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .fixedSize(horizontal: false, vertical: true)
                }
                .padding(UITheme.spacing8)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color.white.opacity(0.05))
                .clipShape(RoundedRectangle(cornerRadius: UITheme.chipCornerRadius))
            }
        }
        .padding(UITheme.spacing10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.white.opacity(0.02))
        .clipShape(RoundedRectangle(cornerRadius: UITheme.chipCornerRadius))
        .overlay(
            RoundedRectangle(cornerRadius: UITheme.chipCornerRadius)
                .stroke(Color.white.opacity(0.06), lineWidth: 1)
        )
    }

    @ViewBuilder
    private func portfolioContent(_ store: StoreDetailDTO) -> some View {
        VStack(alignment: .leading, spacing: UITheme.spacing10) {
            if store.images.isEmpty {
                Text("No portfolio images yet.")
                    .foregroundStyle(.secondary)
            } else {
                let fixedCardHeight: CGFloat = 214
                LazyVGrid(columns: portfolioColumns, spacing: UITheme.spacing8) {
                    ForEach(store.images, id: \.id) { image in
                        AsyncImage(url: imageURL(from: image.image_url)) { phase in
                            switch phase {
                            case .empty:
                                ProgressView()
                                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                            case .success(let img):
                                img
                                    .resizable()
                                    .scaledToFill()
                                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                                    .clipped()
                                    .overlay(
                                        LinearGradient(
                                            colors: [.clear, Color.black.opacity(0.55)],
                                            startPoint: .center,
                                            endPoint: .bottom
                                        )
                                    )
                            case .failure:
                                Color.gray.opacity(0.2)
                                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                            @unknown default:
                                EmptyView()
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .frame(height: fixedCardHeight)
                        .background(Color.white.opacity(0.02))
                        .clipShape(RoundedRectangle(cornerRadius: UITheme.chipCornerRadius))
                        .overlay(
                            RoundedRectangle(cornerRadius: UITheme.chipCornerRadius)
                                .stroke(Color.white.opacity(0.08), lineWidth: 1)
                        )
                    }
                }
            }
        }
        .padding(.horizontal, UITheme.spacing2)
        .padding(.top, UITheme.spacing6)
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    @ViewBuilder
    private func detailsContent(_ store: StoreDetailDTO) -> some View {
        VStack(alignment: .leading, spacing: UITheme.spacing12) {
            locationCard(store)
            contactHoursCard(store)

            if let desc = store.description,
               !desc.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                Text(desc)
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                    .padding(UITheme.cardPadding)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(cardBG)
                    .clipShape(RoundedRectangle(cornerRadius: UITheme.cardCornerRadius))
                    .overlay(
                        RoundedRectangle(cornerRadius: UITheme.cardCornerRadius)
                            .stroke(brandGold.opacity(UITheme.cardStrokeOpacity), lineWidth: 1)
                    )
            }

            Button {
                alertMessage = "Report feature is coming soon."
                showAlert = true
            } label: {
                HStack {
                    Text("Report")
                        .font(.subheadline.weight(.medium))
                        .foregroundStyle(.secondary)
                    Spacer()
                    Image(systemName: "chevron.right")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.secondary)
                }
                .padding(.vertical, UITheme.pillVerticalPadding)
            }
            .buttonStyle(.plain)
            .overlay(alignment: .top) {
                Rectangle()
                    .fill(Color.white.opacity(0.08))
                    .frame(height: UITheme.spacing1)
            }
        }
    }

    private func sectionHeader(_ text: String) -> some View {
        Text(text)
            .font(.caption.weight(.semibold))
            .kerning(UITheme.sectionHeaderKerning)
            .foregroundStyle(.secondary)
    }

    private func locationCard(_ store: StoreDetailDTO) -> some View {
        ZStack(alignment: .bottom) {
            Group {
                if let mapImageURL = h5DetailsMapBackgroundURL {
                    AsyncImage(url: mapImageURL) { phase in
                        switch phase {
                        case .empty:
                            ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
                        case .success(let image):
                            image
                                .resizable()
                                .scaledToFill()
                        case .failure:
                            fallbackGradientBackground
                        @unknown default:
                            fallbackGradientBackground
                        }
                    }
                } else {
                    fallbackGradientBackground
                }
            }
            .frame(height: 306)
            .frame(maxWidth: .infinity)
            .clipped()
            .overlay(
                LinearGradient(
                    colors: [Color.black.opacity(0.08), Color.black.opacity(0.62)],
                    startPoint: .top,
                    endPoint: .bottom
                )
            )

            VStack(alignment: .leading, spacing: UITheme.spacing12) {
                HStack(spacing: UITheme.spacing10) {
                    Group {
                        if let raw = store.images.first?.image_url,
                           let url = imageURL(from: raw) {
                            AsyncImage(url: url) { phase in
                                switch phase {
                                case .success(let image):
                                    image.resizable().scaledToFill()
                                default:
                                    Color.white.opacity(0.08)
                                }
                            }
                        } else {
                            Color.white.opacity(0.08)
                        }
                    }
                    .frame(width: 52, height: 52)
                    .clipShape(Circle())
                    .overlay(
                        Circle().stroke(Color.white.opacity(0.18), lineWidth: 1)
                    )

                    VStack(alignment: .leading, spacing: UITheme.spacing3) {
                        Text(store.name)
                            .font(.system(size: 18, weight: .bold))
                            .foregroundStyle(.white)
                            .lineLimit(1)
                        Text(store.formattedAddress)
                            .font(.system(size: 13, weight: .medium))
                            .foregroundStyle(Color.white.opacity(0.88))
                            .lineLimit(2)
                    }
                }

                if let maps = mapsURL(store.formattedAddress) {
                    Link(destination: maps) {
                        HStack(spacing: UITheme.spacing8) {
                            Image(systemName: "paperplane")
                                .font(.system(size: 16, weight: .semibold))
                                .rotationEffect(.degrees(45))
                            Text("Open in Maps")
                                .font(.system(size: 19, weight: .bold))
                        }
                        .frame(maxWidth: .infinity, minHeight: 58)
                        .background(brandGold)
                        .foregroundStyle(.black)
                        .clipShape(Capsule())
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, UITheme.spacing14)
            .padding(.vertical, UITheme.spacing14)
            .background(
                ZStack {
                    RoundedRectangle(cornerRadius: 24, style: .continuous)
                        .fill(.ultraThinMaterial)
                    RoundedRectangle(cornerRadius: 24, style: .continuous)
                        .fill(Color.black.opacity(0.62))
                }
            )
            .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 22, style: .continuous)
                    .stroke(Color.white.opacity(0.16), lineWidth: 1)
            )
            .padding(.horizontal, UITheme.spacing14)
            .padding(.bottom, UITheme.spacing14)
        }
        .frame(maxWidth: .infinity)
        .frame(height: 306)
        .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .stroke(Color.white.opacity(0.16), lineWidth: 1)
        )
    }

    private var fallbackGradientBackground: some View {
        LinearGradient(
            colors: [
                Color(red: 35.0 / 255.0, green: 35.0 / 255.0, blue: 35.0 / 255.0),
                Color(red: 18.0 / 255.0, green: 18.0 / 255.0, blue: 18.0 / 255.0),
            ],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }

    private func contactHoursCard(_ store: StoreDetailDTO) -> some View {
        VStack(alignment: .leading, spacing: UITheme.spacing12) {
            Text("CONTACT & BUSINESS HOURS")
                .font(.caption.weight(.semibold))
                .kerning(UITheme.sectionHeaderKerning)
                .foregroundStyle(.secondary)

            HStack {
                Text("Today")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                Spacer()
                Text(todayHoursText(fallback: store.opening_hours))
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.white)
            }

            if !viewModel.storeHours.isEmpty {
                Button {
                    withAnimation(.easeInOut(duration: 0.2)) {
                        showFullHours.toggle()
                    }
                } label: {
                    HStack(spacing: UITheme.spacing6) {
                        Text("Show full week")
                            .font(.footnote.weight(.medium))
                        Image(systemName: "chevron.down")
                            .font(.caption2.weight(.semibold))
                            .rotationEffect(.degrees(showFullHours ? 180 : 0))
                    }
                }
                .buttonStyle(.plain)
                .foregroundStyle(brandGold)

                if showFullHours {
                    VStack(spacing: UITheme.spacing6) {
                        ForEach(0..<7, id: \.self) { dayIndex in
                            HStack {
                                Text(dayName(dayIndex))
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                                Spacer()
                                Text(hoursText(for: dayIndex))
                                    .font(.caption)
                                    .foregroundStyle(.white)
                            }
                        }
                    }
                    .padding(.top, UITheme.spacing4)
                }
            }

            Divider().background(Color.white.opacity(0.08))

            if let phone = normalizedText(store.phone) {
                HStack(spacing: UITheme.spacing10) {
                    Image(systemName: "phone.fill")
                        .foregroundStyle(brandGold)
                    Text(phone)
                        .foregroundStyle(.white)
                        .font(.subheadline)
                    Spacer()
                    if let callURL = callURL(from: phone) {
                        Link("Call", destination: callURL)
                            .font(.caption.weight(.semibold))
                            .padding(.horizontal, UITheme.pillHorizontalPadding)
                            .padding(.vertical, UITheme.pillVerticalPadding)
                            .background(Color.white.opacity(0.06))
                            .clipShape(RoundedRectangle(cornerRadius: UITheme.chipCornerRadius))
                            .foregroundStyle(.white)
                    }
                }
            }

            if let email = normalizedText(store.email),
               let mailURL = URL(string: "mailto:\(email)") {
                HStack(spacing: UITheme.spacing10) {
                    Image(systemName: "envelope.fill")
                        .foregroundStyle(brandGold)
                    Text(email)
                        .foregroundStyle(.white)
                        .font(.subheadline)
                        .lineLimit(1)
                    Spacer()
                    Link("Email", destination: mailURL)
                        .font(.caption.weight(.semibold))
                        .padding(.horizontal, UITheme.pillHorizontalPadding)
                        .padding(.vertical, UITheme.pillVerticalPadding)
                        .background(Color.white.opacity(0.06))
                        .clipShape(RoundedRectangle(cornerRadius: UITheme.chipCornerRadius))
                        .foregroundStyle(.white)
                }
            }
        }
        .padding(UITheme.cardPadding)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(cardBG)
        .clipShape(RoundedRectangle(cornerRadius: UITheme.cardCornerRadius))
        .overlay(
            RoundedRectangle(cornerRadius: UITheme.cardCornerRadius)
                .stroke(brandGold.opacity(UITheme.cardStrokeOpacity), lineWidth: 1)
        )
    }

    private func todayHoursText(fallback: String?) -> String {
        guard !viewModel.storeHours.isEmpty else {
            return normalizedText(fallback) ?? "-"
        }
        let todayIndex = backendWeekdayIndex(Date())
        return hoursText(for: todayIndex)
    }

    private func hoursText(for dayIndex: Int) -> String {
        guard let row = viewModel.storeHours.first(where: { $0.day_of_week == dayIndex }) else {
            return "Closed"
        }
        if row.is_closed {
            return "Closed"
        }
        let open = formatTime(row.open_time)
        let close = formatTime(row.close_time)
        if open == "-" || close == "-" {
            return "Closed"
        }
        return "\(open) - \(close)"
    }

    private func dayName(_ dayIndex: Int) -> String {
        let names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        guard dayIndex >= 0, dayIndex < names.count else { return "-" }
        return names[dayIndex]
    }

    private func backendWeekdayIndex(_ date: Date) -> Int {
        // Swift weekday: 1=Sun ... 7=Sat -> backend: 0=Mon ... 6=Sun
        let weekday = Calendar.current.component(.weekday, from: date)
        return (weekday + 5) % 7
    }

    private func formatTime(_ raw: String?) -> String {
        guard let raw, !raw.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            return "-"
        }
        let parser = DateFormatter()
        parser.locale = Locale(identifier: "en_US_POSIX")
        parser.dateFormat = "HH:mm:ss"
        if let date = parser.date(from: raw) {
            let formatter = DateFormatter()
            formatter.locale = Locale(identifier: "en_US_POSIX")
            formatter.dateFormat = "h:mm a"
            return formatter.string(from: date)
        }
        return raw
    }

    private func normalizedText(_ text: String?) -> String? {
        guard let text else { return nil }
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty ? nil : trimmed
    }

    private func callURL(from phone: String) -> URL? {
        let digits = phone.filter { $0.isNumber }
        guard !digits.isEmpty else { return nil }
        return URL(string: "tel://\(digits)")
    }

    private var selectedServices: [ServiceDTO] {
        selectedServiceIDs.compactMap { serviceID in
            viewModel.services.first(where: { $0.id == serviceID })
        }
    }

    private var primarySelectedService: ServiceDTO? {
        selectedServices.first
    }

    private var selectedServicesDurationText: String {
        guard let primary = primarySelectedService else { return "0m" }
        return formatDuration(primary.duration_minutes)
    }

    private var selectedServicesTotalPriceText: String {
        guard let primary = primarySelectedService else { return "$0.00" }
        return "$\(String(format: "%.2f", primary.price))"
    }

    private func selectedServicesBar(store: StoreDetailDTO, services: [ServiceDTO]) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: UITheme.spacing6) {
                Text("\(services.count) \(services.count == 1 ? "SERVICE" : "SERVICES") SELECTED")
                    .font(.caption.weight(.bold))
                    .kerning(2.2)
                    .foregroundStyle(.secondary)

                HStack(spacing: UITheme.spacing8) {
                    Text(selectedServicesTotalPriceText)
                        .font(.system(size: 18, weight: .bold))
                        .foregroundStyle(.white)
                    Text("Est. Total")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                    Rectangle()
                        .fill(Color.white.opacity(0.18))
                        .frame(width: 1, height: 16)
                    Image(systemName: "clock")
                        .font(.footnote.weight(.semibold))
                        .foregroundStyle(brandGold)
                    Text(selectedServicesDurationText)
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }

            Spacer()

            if primarySelectedService != nil {
                Button {
                    showBookServicesSheet = true
                } label: {
                    Text("Continue")
                        .font(.system(size: 20, weight: .bold))
                        .foregroundStyle(.black)
                        .frame(minWidth: 180, minHeight: 66)
                        .background(brandGold)
                        .clipShape(Capsule())
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal, UITheme.pagePadding)
        .padding(.top, UITheme.spacing12)
        .padding(.bottom, UITheme.spacing8)
        .background(Color.black.opacity(0.96))
        .overlay(alignment: .top) {
            Rectangle()
                .fill(Color.white.opacity(0.12))
                .frame(height: UITheme.spacing1)
        }
    }

    private func toggleServiceSelection(_ serviceID: Int) {
        if let index = selectedServiceIDs.firstIndex(of: serviceID) {
            selectedServiceIDs.remove(at: index)
        } else {
            selectedServiceIDs.append(serviceID)
        }
    }

    private func formatDuration(_ minutes: Int) -> String {
        let hours = minutes / 60
        let mins = minutes % 60
        if hours > 0 {
            return "\(hours)h \(mins)m"
        }
        return "\(mins)m"
    }

    private func currentBottomSafeAreaInset() -> CGFloat {
        let scenes = UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .filter { $0.activationState == .foregroundActive }

        guard let scene = scenes.first,
              let window = scene.windows.first(where: \.isKeyWindow) ?? scene.windows.first
        else {
            return 0
        }

        return window.safeAreaInsets.bottom
    }

    private func captureAndHideSystemTabBar() {
        guard let tabBar = currentSystemTabBar() else { return }
        if previousSystemTabBarHidden == nil {
            previousSystemTabBarHidden = tabBar.isHidden
        }
        tabBar.isHidden = true
    }

    private func restoreSystemTabBarVisibility() {
        guard let previous = previousSystemTabBarHidden,
              let tabBar = currentSystemTabBar()
        else { return }
        tabBar.isHidden = previous
        previousSystemTabBarHidden = nil
    }

    private func currentSystemTabBar() -> UITabBar? {
        let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
        for scene in scenes where scene.activationState == .foregroundActive {
            for window in scene.windows {
                if let tabBar = findTabBar(in: window.rootViewController)?.tabBar {
                    return tabBar
                }
            }
        }
        return nil
    }

    private func findTabBar(in root: UIViewController?) -> UITabBarController? {
        guard let root else { return nil }
        if let tab = root as? UITabBarController {
            return tab
        }
        for child in root.children {
            if let found = findTabBar(in: child) {
                return found
            }
        }
        if let presented = root.presentedViewController {
            return findTabBar(in: presented)
        }
        return nil
    }

    private func imageURL(from raw: String) -> URL? {
        if raw.lowercased().hasPrefix("http") {
            return URL(string: raw)
        }
        let base = APIClient.shared.baseURL.replacingOccurrences(of: "/api/v1", with: "")
        return URL(string: "\(base)\(raw)")
    }

    private func formatReviewDate(_ raw: String) -> String {
        if let date = parseISODate(raw) {
            let formatter = DateFormatter()
            formatter.dateFormat = "MMM d, yyyy"
            return formatter.string(from: date)
        }
        return raw
    }

    private func parseISODate(_ raw: String) -> Date? {
        let parserWithFraction = ISO8601DateFormatter()
        parserWithFraction.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = parserWithFraction.date(from: raw) {
            return date
        }
        let parser = ISO8601DateFormatter()
        parser.formatOptions = [.withInternetDateTime]
        if let date = parser.date(from: raw) {
            return date
        }
        let fallback = DateFormatter()
        fallback.locale = Locale(identifier: "en_US_POSIX")
        fallback.dateFormat = "yyyy-MM-dd'T'HH:mm:ss"
        return fallback.date(from: raw)
    }

    private func mapsURL(_ address: String) -> URL? {
        let trimmed = address.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return nil }
        let encoded = trimmed.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? trimmed
        return URL(string: "https://www.google.com/maps/search/?api=1&query=\(encoded)")
    }

    private var h5DetailsMapBackgroundURL: URL? {
        URL(string: "https://images.unsplash.com/photo-1664044056437-6330bcf8e2fe?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjaXR5JTIwc3RyZWV0JTIwbWFwJTIwZ3JhcGhpYyUyMHRvcCUyMHZpZXd8ZW58MXx8fHwxNzY1OTM3MzkzfDA&ixlib=rb-4.1.0&q=80&w=1080")
    }

    private var reviewImageViewer: some View {
        ZStack(alignment: .topTrailing) {
            Color.black.ignoresSafeArea()

            TabView(selection: $reviewGalleryIndex) {
                ForEach(Array(reviewGalleryImages.enumerated()), id: \.offset) { idx, url in
                    AsyncImage(url: url) { phase in
                        switch phase {
                        case .empty:
                            ProgressView()
                                .tint(.white)
                                .frame(maxWidth: .infinity, maxHeight: .infinity)
                        case .success(let image):
                            image
                                .resizable()
                                .scaledToFit()
                                .frame(maxWidth: .infinity, maxHeight: .infinity)
                                .background(Color.black)
                        case .failure:
                            VStack(spacing: UITheme.spacing8) {
                                Image(systemName: "photo")
                                Text("Image unavailable")
                            }
                            .font(.caption)
                            .foregroundStyle(.white.opacity(0.8))
                            .frame(maxWidth: .infinity, maxHeight: .infinity)
                        @unknown default:
                            EmptyView()
                        }
                    }
                    .tag(idx)
                }
            }
            .tabViewStyle(.page(indexDisplayMode: .always))
            .indexViewStyle(.page(backgroundDisplayMode: .always))

            VStack(alignment: .trailing, spacing: UITheme.spacing12) {
                Text("\(min(reviewGalleryIndex + 1, reviewGalleryImages.count))/\(max(reviewGalleryImages.count, 1))")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.white.opacity(0.9))
                    .padding(.horizontal, UITheme.pillHorizontalPadding)
                    .padding(.vertical, UITheme.pillVerticalPadding)
                    .background(Color.black.opacity(0.5))
                    .clipShape(Capsule())

                Button {
                    showReviewGallery = false
                } label: {
                    Image(systemName: "xmark")
                        .font(.headline.weight(.bold))
                        .foregroundStyle(.white)
                        .padding(UITheme.spacing10)
                        .background(Color.black.opacity(0.55))
                        .clipShape(Circle())
                }
                .buttonStyle(.plain)
            }
            .padding(.top, UITheme.spacing16 + UITheme.spacing4)
            .padding(.trailing, UITheme.pagePadding)
        }
        .tint(.white)
    }
}

private extension View {
    @ViewBuilder
    func h5BottomSheetStyle() -> some View {
        if #available(iOS 16.4, *) {
            self
                .presentationCornerRadius(26)
                .presentationBackground(Color.black)
        } else {
            self
        }
    }
}

#Preview {
    NavigationStack {
        StoreDetailView(storeID: 1)
    }
}
